using System.Data;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class SocialTicketService(IUnitOfWork uow, ISocialTicketRepository tickets) : ISocialTicketService
{
    public async Task<IReadOnlyList<SocialPaymentMethodDto>> PaymentMethodsAsync() =>
        (await tickets.ListOnlineMethodsAsync()).Select(x => new SocialPaymentMethodDto(x.Id, x.MethodCode, x.MethodName)).ToList();

    public async Task<SocialTicketDto> ReserveAsync(int sessionId, int userId, ReserveSocialTicketDto input)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var user = await uow.Users.GetWithProfileAsync(userId);
            if (user is null || !user.IsActive || user.UserRole?.Role.RoleCode != "PLAYER" || user.PlayerProfile is null)
                throw new ForbiddenException("Chỉ người chơi có hồ sơ hoạt động được mua vé.");
            var profile = user.PlayerProfile;
            var s = await uow.SocialSessions.GetDetailAsync(sessionId) ?? throw new NotFoundException("Buổi Social", sessionId);
            var now = DateTime.UtcNow;
            if (s.Status != "Published" || SocialTicketPolicy.StartsUtc(s) <= now)
                throw new ConflictException("Buổi Social không còn mở đăng ký.");
            if (profile.ReputationScore < 60) throw new ForbiddenException("Điểm uy tín phải từ 60 trở lên.");
            if (profile.NumericSkillRating < s.MinSkill || profile.NumericSkillRating > s.MaxSkill)
                throw new ValidationException(["Trình độ không phù hợp với buổi Social."]);
            // Clean up expired unpaid holds before reserving. Never discard a confirmed payment.
            foreach (var expired in s.Participants.Where(p => p.Status == "PendingPayment" && !SocialTicketPolicy.IsLiveHold(p, now)))
            {
                var pmt = await tickets.GetPaymentAsync(expired.Id);
                if (pmt?.Status == PaymentStatus.Confirmed)
                    throw new ConflictException("Có giao dịch cần đối soát với hệ thống thanh toán.");
                if (pmt?.Status == PaymentStatus.Pending) pmt.Status = PaymentStatus.Failed;
                expired.Status = "Cancelled";
            }
            if (s.Participants.Any(p => p.UserId == userId && SocialTicketPolicy.OccupiesSlot(p, now)))
                throw new ConflictException("Bạn đã có vé hoặc đang giữ slot cho buổi này.");
            if (s.Participants.Count(p => SocialTicketPolicy.OccupiesSlot(p, now)) >= s.MaxParticipants)
                throw new ConflictException("Buổi Social đã hết slot.");
            if (s.FeePerSlot < 0) throw new ConflictException("Giá vé không hợp lệ.");
            PaymentMethod? method = null;
            if (s.FeePerSlot > 0)
            {
                if (SocialTicketPolicy.StartsUtc(s) - now < SocialTicketPolicy.HoldDuration)
                    throw new ConflictException("Không đủ thời gian giữ slot trước giờ chơi.");
                if (input.PaymentMethodId is not int methodId || methodId <= 0)
                    throw new ValidationException(["Vui lòng chọn phương thức thanh toán."]);
                method = await tickets.GetPaymentMethodAsync(methodId);
                if (method is null || method.MethodCode is not ("MOCK_ONLINE" or "QR_TRANSFER"))
                    throw new ValidationException(["Phương thức thanh toán online chưa khả dụng."]);
            }
            var ticket = new SocialParticipant { SessionId = sessionId, UserId = userId,
                RegisteredAt = now, PaidAmount = 0, Status = method is null ? "Confirmed" : "PendingPayment" };
            await tickets.AddTicketAsync(ticket);
            await uow.SaveChangesAsync();
            PaymentTransaction? payment = null;
            if (method is not null)
            {
                payment = new PaymentTransaction { SocialParticipantId = ticket.Id, PaymentMethodId = method.Id,
                    Amount = s.FeePerSlot, Status = PaymentStatus.Pending };
                await tickets.AddPaymentAsync(payment);
                await uow.SaveChangesAsync();
            }
            await uow.CommitTransactionAsync();
            return Map(ticket, s, payment, now);
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    public async Task<IReadOnlyList<SocialTicketDto>> MyTicketsAsync(int userId)
    {
        var result = new List<SocialTicketDto>();
        var now = DateTime.UtcNow;
        foreach (var t in await tickets.ListByUserAsync(userId))
            result.Add(Map(t, t.Session, await tickets.GetPaymentAsync(t.Id), now));
        return result;
    }

    public async Task<SocialCancellationQuoteDto> QuoteAsync(int ticketId, int userId)
    {
        var t = await OwnAsync(ticketId, userId);
        return Quote(t, await tickets.GetPaymentAsync(t.Id), DateTime.UtcNow);
    }

    public async Task<SocialTicketDto> CancelAsync(int ticketId, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var t = await OwnAsync(ticketId, userId);
            var p = await tickets.GetPaymentAsync(t.Id);
            var now = DateTime.UtcNow;
            var quote = Quote(t, p, now);
            if (!quote.CanCancel) throw new ConflictException(quote.Message);
            if (p?.Status == PaymentStatus.Pending) p.Status = PaymentStatus.Failed;
            // Only the local mock ledger is supported here; real refunds need TV5's gateway.
            if (p?.Status == PaymentStatus.Confirmed) p.Status = PaymentStatus.Refunded;
            t.Status = "Cancelled";
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            return Map(t, t.Session, p, now);
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    // Integration entry point for TV5 after trusted payment verification. Not an HTTP action.
    public async Task ConfirmPaidAsync(int transactionId, decimal verifiedAmount, string referenceCode)
    {
        if (string.IsNullOrWhiteSpace(referenceCode)) throw new ValidationException(["Thiếu mã xác nhận thanh toán."]);
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var p = await tickets.GetPaymentByIdAsync(transactionId) ?? throw new NotFoundException("Giao dịch Social", transactionId);
            var t = await tickets.GetAsync(p.SocialParticipantId!.Value) ?? throw new NotFoundException("Vé Social", p.SocialParticipantId.Value);
            if (verifiedAmount != p.Amount) throw new ConflictException("Số tiền xác nhận không khớp.");
            if (p.Status == PaymentStatus.Confirmed && t.Status == "Confirmed" && p.ReferenceCode == referenceCode)
            { await uow.CommitTransactionAsync(); return; }
            var now = DateTime.UtcNow;
            if (p.Status != PaymentStatus.Pending || !SocialTicketPolicy.IsLiveHold(t, now) ||
                t.Session.Status != "Published" || SocialTicketPolicy.StartsUtc(t.Session) <= now)
                throw new ConflictException("Slot đã hết hạn hoặc giao dịch không còn chờ thanh toán; cần đối soát.");
            p.Status = PaymentStatus.Confirmed; p.ReferenceCode = referenceCode; p.ProcessedAt = now;
            t.Status = "Confirmed"; t.PaidAmount = p.Amount;
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    private async Task<SocialParticipant> OwnAsync(int ticketId, int userId)
    {
        var t = await tickets.GetAsync(ticketId) ?? throw new NotFoundException("Vé Social", ticketId);
        if (t.UserId != userId) throw new NotFoundException("Vé Social", ticketId);
        return t;
    }

    private static SocialCancellationQuoteDto Quote(SocialParticipant t, PaymentTransaction? p, DateTime now)
    {
        if (t.Status == "PendingPayment" && t.PaidAmount == 0 && p?.Status != PaymentStatus.Confirmed)
            return new(true, 0, "Hủy giữ slot chưa thanh toán.");
        if (t.Status != "Confirmed" || t.Session.Status != "Published" || SocialTicketPolicy.StartsUtc(t.Session) <= now)
            return new(false, null, "Vé không còn đủ điều kiện hủy.");
        if (!SocialTicketPolicy.EarlyCancellation(t.Session, now))
            return new(false, null, "Hủy sát giờ cần quy định mức phạt cọc và điểm uy tín từ nhóm.");
        if (t.PaidAmount == 0 && p is null) return new(true, 0, "Hủy vé miễn phí.");
        if (p?.Status != PaymentStatus.Confirmed || p.Amount != t.PaidAmount)
            return new(false, null, "Giao dịch cần đối soát.");
        if (p.PaymentMethod.MethodCode != "MOCK_ONLINE")
            return new(false, t.PaidAmount, "Được hoàn 100%, chờ tích hợp cổng hoàn tiền TV5.");
        return new(true, t.PaidAmount, "Hoàn 100% trên sổ giao dịch giả lập.");
    }

    private static SocialTicketDto Map(SocialParticipant t, SocialSession s, PaymentTransaction? p, DateTime now) => new(
        t.Id, t.SessionId, s.Title,
        t.Status == "PendingPayment" && !SocialTicketPolicy.IsLiveHold(t, now) ? "Expired" : t.Status,
        t.PaidAmount, p?.Amount ?? t.PaidAmount, t.RegisteredAt,
        t.Status == "PendingPayment" ? SocialTicketPolicy.ExpiresUtc(t) : null,
        p?.Id, p?.Status.ToString());
}
