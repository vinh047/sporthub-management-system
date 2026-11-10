using SportHub.Application.DTOs.CheckIn;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class CheckInService(
    IUnitOfWork uow,
    ICourtStatusNotifier? courtStatusNotifier = null) : ICheckInService
{
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    public async Task<List<CheckInItem>> LookupAsync(string keyword, int staffUserId, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            throw new ValidationException(["Nhập mã đơn, tên hoặc số điện thoại khách."]);

        var cleanKeyword = keyword.Trim();
        if (cleanKeyword.Length is < 2 or > 50)
            throw new ValidationException(["Từ khóa tra cứu phải từ 2 đến 50 ký tự."]);

        var details = await uow.CheckIns.SearchDetailsAsync(cleanKeyword, Today);

        // Staff chỉ thấy đơn thuộc cơ sở mình
        if (!isAdmin)
        {
            var facilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            details = details.Where(d => d.Court.FacilityId == facilityId).ToList();
        }

        return details.Select(ToItem).ToList();
    }

    public async Task<List<CheckInItem>> GetTodayAsync(int facilityId, int staffUserId, bool isAdmin)
    {
        if (facilityId <= 0)
            throw new ValidationException(["Mã cơ sở không hợp lệ."]);

        await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);
        var details = await uow.CheckIns.GetDetailsByFacilityAsync(facilityId, Today);
        return details.Select(ToItem).ToList();
    }

    public async Task<List<CheckInHistoryItemDto>> GetHistoryAsync(int facilityId, DateOnly? playDate, int staffUserId, bool isAdmin)
    {
        if (facilityId <= 0)
            throw new ValidationException(["Mã cơ sở không hợp lệ."]);

        await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);
        var logs = await uow.CheckIns.GetCheckInHistoryAsync(facilityId, playDate);
        return logs.Select(l => new CheckInHistoryItemDto(
            l.Id,
            l.BookingDetailId,
            l.BookingDetail.BookingId,
            l.BookingDetail.Booking.BookingCode,
            l.ParticipantUser?.FullName ?? l.BookingDetail.Booking.User?.FullName ?? l.BookingDetail.Booking.GuestName ?? "Khách vãng lai",
            l.ParticipantUser?.PhoneNumber ?? l.BookingDetail.Booking.User?.PhoneNumber ?? l.BookingDetail.Booking.GuestPhone,
            l.BookingDetail.Court.CourtName,
            l.BookingDetail.PlayDate,
            l.BookingDetail.TimeSlot.StartTime,
            l.BookingDetail.TimeSlot.EndTime,
            l.CheckInChannel.ToString(),
            l.CheckInAt,
            l.StaffUser.FullName,
            l.BookingDetail.Booking.BookingStatus.ToString()
        )).ToList();
    }

    public async Task CheckInAsync(CheckInRequest request, int staffUserId, bool isAdmin)
    {
        if (request.BookingDetailId <= 0)
            throw new ValidationException(["Mã chi tiết ca đặt sân không hợp lệ."]);
        if (string.IsNullOrWhiteSpace(request.Channel) || !Enum.TryParse<CheckInChannel>(request.Channel.Trim(), true, out var channel))
            throw new ValidationException(["Kênh check-in không hợp lệ (Phone, BookingCode, QRCode, Manual)."]);

        var detail = await uow.CheckIns.GetDetailForCheckInAsync(request.BookingDetailId)
            ?? throw new NotFoundException("Chi tiết đơn", request.BookingDetailId);

        await EnsureSameFacilityAsync(detail.Court.FacilityId, staffUserId, isAdmin);

        if (detail.Booking.BookingStatus == BookingStatus.Cancelled)
            throw new ValidationException(["Đơn đã bị hủy, không thể check-in."]);
        if (detail.Booking.BookingStatus == BookingStatus.NoShow)
            throw new ValidationException(["Đơn đã bị đánh dấu vắng mặt (No-Show), không thể check-in."]);
        if (detail.Booking.BookingStatus is not (BookingStatus.Confirmed or BookingStatus.Completed))
            throw new ValidationException(["Đơn chưa được xác nhận thanh toán. Vui lòng thu tiền tại quầy trước khi Check-in."]);
        if (detail.PlayDate != Today)
            throw new ValidationException(["Chỉ check-in được đơn của ngày hôm nay."]);
        if (detail.CheckInLogs.Count > 0)
            throw new ConflictException("Khung giờ này đã được check-in.");

        await uow.CheckIns.AddAsync(new CheckInLog
        {
            BookingDetailId = detail.Id,
            ParticipantUserId = detail.Booking.UserId,
            StaffUserId = staffUserId,
            CheckInChannel = channel,
            CheckInAt = DateTime.UtcNow
        });

        await ApplyCheckInReputationIfNeededAsync(detail.Booking);
        await uow.SaveChangesAsync();
    }

    public async Task<ReceptionBookingDetailDto> GetBookingOrderAsync(int bookingId, int staffUserId, bool isAdmin)
    {
        if (bookingId <= 0)
            throw new ValidationException(["Mã đơn đặt sân không hợp lệ."]);

        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        return await MapToReceptionDetailAsync(booking);
    }

    public async Task<ReceptionBookingDetailDto> CheckInAllSlotsAsync(
        int bookingId,
        CheckInAllSlotsRequest request,
        int staffUserId,
        bool isAdmin)
    {
        var channelStr = string.IsNullOrWhiteSpace(request.Channel) ? "Manual" : request.Channel.Trim();
        if (!Enum.TryParse<CheckInChannel>(channelStr, true, out var channel))
            throw new ValidationException(["Kênh check-in không hợp lệ (Phone, BookingCode, QRCode, Manual)."]);

        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        if (booking.BookingStatus == BookingStatus.Cancelled)
            throw new ValidationException(["Đơn đã bị hủy, không thể check-in."]);
        if (booking.BookingStatus == BookingStatus.NoShow)
            throw new ValidationException(["Đơn đã bị đánh dấu vắng mặt, không thể check-in."]);
        if (booking.BookingStatus is not (BookingStatus.Confirmed or BookingStatus.Completed))
            throw new ValidationException(["Đơn chưa được xác nhận thanh toán. Vui lòng thu tiền tại quầy trước."]);

        var pendingDetails = booking.Details.Where(d => d.CheckInLogs.Count == 0).ToList();
        if (pendingDetails.Count == 0)
            throw new ConflictException("Tất cả các khung giờ của đơn này đều đã được Check-in.");

        var now = DateTime.UtcNow;
        foreach (var detail in pendingDetails)
        {
            await uow.CheckIns.AddAsync(new CheckInLog
            {
                BookingDetailId = detail.Id,
                ParticipantUserId = booking.UserId,
                StaffUserId = staffUserId,
                CheckInChannel = channel,
                CheckInAt = now
            });
        }

        await ApplyCheckInReputationIfNeededAsync(booking);
        await uow.SaveChangesAsync();

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(bookingId) ?? booking;
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> UndoSlotCheckInAsync(int bookingDetailId, int staffUserId, bool isAdmin)
    {
        if (bookingDetailId <= 0)
            throw new ValidationException(["Mã chi tiết ca đặt sân không hợp lệ."]);

        var detail = await uow.CheckIns.GetDetailForCheckInAsync(bookingDetailId)
            ?? throw new NotFoundException("Chi tiết ca đặt sân", bookingDetailId);

        await EnsureSameFacilityAsync(detail.Court.FacilityId, staffUserId, isAdmin);

        if (detail.Booking.BookingStatus == BookingStatus.Completed)
            throw new ConflictException("Không thể hoàn tác Check-in khi đơn đã hoàn tất Check-out.");

        var log = detail.CheckInLogs.OrderByDescending(l => l.CheckInAt).FirstOrDefault()
            ?? throw new NotFoundException("Lịch sử Check-in", bookingDetailId);

        uow.CheckIns.RemoveCheckInLog(log);
        await uow.SaveChangesAsync();

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(detail.BookingId)
            ?? throw new NotFoundException("Đơn đặt sân", detail.BookingId);
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> CollectPaymentAtCounterAsync(
        int bookingId,
        CollectBookingPaymentRequest request,
        int staffUserId,
        bool isAdmin)
    {
        if (request.PaymentMethodId <= 0)
            throw new ValidationException(["Phương thức thanh toán không hợp lệ."]);

        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        if (booking.BookingStatus is BookingStatus.Cancelled or BookingStatus.NoShow)
            throw new ConflictException("Không thể thu tiền cho đơn đã hủy hoặc đã báo vắng mặt.");

        var paidAmount = CalculateNetPaidAmount(booking);
        var remaining = Math.Max(0m, booking.FinalAmount - paidAmount);
        var collectAmount = request.Amount.HasValue && request.Amount.Value > 0m
            ? request.Amount.Value
            : remaining;

        if (collectAmount <= 0m)
            throw new ConflictException("Đơn đặt sân này đã được thanh toán đủ.");

        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            BookingId = booking.Id,
            PaymentMethodId = request.PaymentMethodId,
            Amount = collectAmount,
            ReferenceCode = string.IsNullOrWhiteSpace(request.ReferenceCode)
                ? $"POS-PAY-{DateTime.Now:yyMMddHHmmss}"
                : request.ReferenceCode.Trim(),
            Status = PaymentStatus.Confirmed,
            TransactionType = PaymentTransactionType.Payment,
            ProcessedAt = DateTime.UtcNow,
            StaffVerifierId = staffUserId
        });

        if (booking.BookingStatus == BookingStatus.Held)
        {
            booking.BookingStatus = BookingStatus.Confirmed;
            booking.HoldExpiresAt = null;
        }

        await uow.SaveChangesAsync();
        await NotifyBookingSlotsAsync(booking, "Confirmed");

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(bookingId) ?? booking;
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> CheckoutBookingAsync(
        int bookingId,
        CheckoutBookingRequest request,
        int staffUserId,
        bool isAdmin)
    {
        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        if (booking.BookingStatus == BookingStatus.Cancelled)
            throw new ConflictException("Đơn đã bị hủy, không thể Check-out.");
        if (booking.BookingStatus == BookingStatus.NoShow)
            throw new ConflictException("Đơn đã đánh dấu vắng mặt, không thể Check-out.");
        if (booking.BookingStatus == BookingStatus.Completed)
            throw new ConflictException("Đơn đặt sân này đã hoàn tất Check-out trước đó.");

        // Nếu đơn còn số tiền chưa thanh toán và lễ tân chọn phương thức thu tiền khi Check-out
        var paidAmount = CalculateNetPaidAmount(booking);
        var remaining = Math.Max(0m, booking.FinalAmount - paidAmount);
        if (remaining > 0m)
        {
            var methodId = request.PaymentMethodId ?? 1; // Mặc định tiền mặt tại quầy
            booking.PaymentTransactions.Add(new PaymentTransaction
            {
                BookingId = booking.Id,
                PaymentMethodId = methodId,
                Amount = remaining,
                ReferenceCode = $"POS-CHKOUT-{DateTime.Now:yyMMddHHmmss}",
                Status = PaymentStatus.Confirmed,
                TransactionType = PaymentTransactionType.Payment,
                ProcessedAt = DateTime.UtcNow,
                StaffVerifierId = staffUserId
            });
        }

        // Nếu còn ca nào chưa được bấm Check-in thì tự động ghi nhận CheckInLog khi Check-out
        var now = DateTime.UtcNow;
        foreach (var detail in booking.Details.Where(d => d.CheckInLogs.Count == 0))
        {
            await uow.CheckIns.AddAsync(new CheckInLog
            {
                BookingDetailId = detail.Id,
                ParticipantUserId = booking.UserId,
                StaffUserId = staffUserId,
                CheckInChannel = CheckInChannel.Manual,
                CheckInAt = now
            });
        }

        booking.BookingStatus = BookingStatus.Completed;
        booking.HoldExpiresAt = null;

        // Tích điểm Loyalty + Điểm Uy tín + Số trận đã chơi cho khách Thành viên
        if (booking.UserId.HasValue)
        {
            var profile = await uow.CheckIns.GetOrCreatePlayerProfileAsync(booking.UserId.Value);
            if (profile is not null)
            {
                profile.TotalMatchesPlayed += 1;

                var existingLoyalty = await uow.CheckIns.GetBookingLoyaltyPointsAsync(booking.Id);
                if (existingLoyalty == 0 && booking.FinalAmount > 0m)
                {
                    var earnedPoints = Math.Max(1, (int)Math.Floor(booking.FinalAmount / 10000m));
                    profile.LoyaltyPoints += earnedPoints;
                    profile.CurrentTier = ResolveLoyaltyTier(profile.LoyaltyPoints);

                    await uow.CheckIns.AddLoyaltyHistoryAsync(new LoyaltyHistory
                    {
                        UserId = booking.UserId.Value,
                        PointsChanged = earnedPoints,
                        Reason = $"Check-out hoàn tất đơn đặt sân {booking.BookingCode}",
                        RelatedBookingId = booking.Id,
                        CreatedAt = now
                    });
                }

                await ApplyCheckInReputationIfNeededAsync(booking, profile);
            }
        }

        await uow.SaveChangesAsync();

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(bookingId) ?? booking;
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> MarkNoShowAsync(
        int bookingId,
        MarkNoShowRequest request,
        int staffUserId,
        bool isAdmin)
    {
        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        if (booking.BookingStatus == BookingStatus.Completed)
            throw new ConflictException("Đơn đã Check-out hoàn tất, không thể đánh dấu vắng mặt.");
        if (booking.BookingStatus == BookingStatus.Cancelled)
            throw new ConflictException("Đơn đã bị hủy trước đó.");
        if (booking.BookingStatus == BookingStatus.NoShow)
            throw new ConflictException("Đơn này đã được đánh dấu vắng mặt (No-Show).");
        if (booking.Details.Any(d => d.CheckInLogs.Count > 0))
            throw new ConflictException("Khách đã Check-in nhận sân, không thể đánh dấu vắng mặt.");

        booking.BookingStatus = BookingStatus.NoShow;
        booking.HoldExpiresAt = null;

        if (booking.UserId.HasValue)
        {
            var profile = await uow.CheckIns.GetOrCreatePlayerProfileAsync(booking.UserId.Value);
            if (profile is not null)
            {
                profile.TotalNoShows += 1;
                profile.ReputationScore = Math.Max(0, profile.ReputationScore - 10);

                var noteText = string.IsNullOrWhiteSpace(request.Note) ? "" : $" ({request.Note.Trim()})";
                await uow.CheckIns.AddReputationHistoryAsync(new ReputationHistory
                {
                    UserId = booking.UserId.Value,
                    ScoreDelta = -10,
                    Reason = $"Vắng mặt không nhận sân (No-Show) đơn {booking.BookingCode}{noteText}",
                    RelatedBookingId = booking.Id
                });
            }
        }

        await uow.SaveChangesAsync();
        await RefreshAndNotifySlotsAsync(booking);

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(bookingId) ?? booking;
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> CancelBookingAtCounterAsync(
        int bookingId,
        ReceptionCancelBookingRequest request,
        int staffUserId,
        bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 3)
            throw new ValidationException(["Vui lòng nhập lý do hủy đơn tại quầy (tối thiểu 3 ký tự)."]);

        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        if (booking.BookingStatus == BookingStatus.Completed)
            throw new ConflictException("Không thể hủy đơn đã hoàn tất Check-out.");
        if (booking.BookingStatus == BookingStatus.Cancelled)
            throw new ConflictException("Đơn đặt sân này đã bị hủy trước đó.");

        booking.BookingStatus = BookingStatus.Cancelled;
        booking.HoldExpiresAt = null;
        booking.Cancellation ??= new BookingCancellation
        {
            BookingId = booking.Id,
            CancelledByUserId = staffUserId,
            CancelledAt = DateTime.UtcNow,
            CancelReason = request.Reason.Trim(),
            RefundPercent = 0m,
            RefundAmount = 0m,
            PenaltyAmount = booking.FinalAmount,
            RefundStatus = RefundStatus.NotRequired
        };

        await uow.SaveChangesAsync();
        await RefreshAndNotifySlotsAsync(booking);

        var updated = await uow.CheckIns.GetBookingForReceptionAsync(bookingId) ?? booking;
        return await MapToReceptionDetailAsync(updated);
    }

    public async Task<ReceptionBookingDetailDto> UpdateGuestInfoAsync(
        int bookingId,
        UpdateGuestInfoRequest request,
        int staffUserId,
        bool isAdmin)
    {
        var name = (request.GuestName ?? string.Empty).Trim();
        var phone = (request.GuestPhone ?? string.Empty).Trim();
        var phoneDigits = new string(phone.Where(char.IsDigit).ToArray());

        if (name.Length is < 2 or > 100)
            throw new ValidationException(["Tên người nhận sân phải từ 2 đến 100 ký tự."]);
        if (phoneDigits.Length is < 9 or > 15)
            throw new ValidationException(["Số điện thoại người nhận sân không hợp lệ (9–15 chữ số)."]);

        var booking = await uow.CheckIns.GetBookingForReceptionAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId);

        var facilityId = booking.Details.FirstOrDefault()?.Court.FacilityId ?? 0;
        if (facilityId > 0)
            await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);

        booking.GuestName = name;
        booking.GuestPhone = phone;

        await uow.SaveChangesAsync();
        return await MapToReceptionDetailAsync(booking);
    }

    private async Task ApplyCheckInReputationIfNeededAsync(Booking booking, PlayerProfile? existingProfile = null)
    {
        if (!booking.UserId.HasValue) return;

        var existingDelta = await uow.CheckIns.GetBookingReputationDeltaAsync(booking.Id);
        if (existingDelta != 0) return;

        var profile = existingProfile ?? await uow.CheckIns.GetOrCreatePlayerProfileAsync(booking.UserId.Value);
        if (profile is null) return;

        profile.ReputationScore = Math.Min(100, profile.ReputationScore + 2);
        await uow.CheckIns.AddReputationHistoryAsync(new ReputationHistory
        {
            UserId = booking.UserId.Value,
            ScoreDelta = 2,
            Reason = $"Check-in nhận sân đúng giờ đơn {booking.BookingCode}",
            RelatedBookingId = booking.Id
        });
    }

    private static string ResolveLoyaltyTier(int points) => points switch
    {
        >= 1000 => "Platinum",
        >= 500 => "Gold",
        >= 200 => "Silver",
        _ => "Bronze"
    };

    private static decimal CalculateNetPaidAmount(Booking booking)
    {
        var paid = booking.PaymentTransactions
            .Where(t => t.TransactionType == PaymentTransactionType.Payment && t.Status == PaymentStatus.Confirmed)
            .Sum(t => t.Amount);
        var refunded = booking.PaymentTransactions
            .Where(t => t.TransactionType == PaymentTransactionType.Refund &&
                        (t.Status == PaymentStatus.Confirmed || t.Status == PaymentStatus.Refunded))
            .Sum(t => t.Amount);
        return Math.Max(0m, paid - refunded);
    }

    private async Task NotifyBookingSlotsAsync(Booking booking, string status)
    {
        if (courtStatusNotifier is null) return;
        foreach (var detail in booking.Details)
        {
            await courtStatusNotifier.NotifySlotUpdatedAsync(
                detail.Court.FacilityId,
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId,
                status);
        }
    }

    private async Task RefreshAndNotifySlotsAsync(Booking booking)
    {
        if (courtStatusNotifier is null) return;
        foreach (var detail in booking.Details)
        {
            var currentStatus = await uow.Bookings.GetSlotStatusAsync(detail.CourtId, detail.PlayDate, detail.TimeSlotId);
            await courtStatusNotifier.NotifySlotUpdatedAsync(
                detail.Court.FacilityId,
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId,
                currentStatus);
        }
    }

    private async Task<ReceptionBookingDetailDto> MapToReceptionDetailAsync(Booking b)
    {
        var firstDetail = b.Details.FirstOrDefault();
        var facilityId = firstDetail?.Court?.FacilityId ?? 0;
        var facilityName = firstDetail?.Court?.Facility?.Name ?? "SportHub";

        var customerType = b.UserId.HasValue ? "Member" : "Guest";
        var customerName = !string.IsNullOrWhiteSpace(b.GuestName)
            ? b.GuestName
            : b.User?.FullName ?? "Khách vãng lai";
        var customerPhone = !string.IsNullOrWhiteSpace(b.GuestPhone)
            ? b.GuestPhone
            : b.User?.PhoneNumber;

        var paidAmount = CalculateNetPaidAmount(b);
        var remainingAmount = b.BookingStatus is BookingStatus.Cancelled or BookingStatus.NoShow
            ? 0m
            : Math.Max(0m, b.FinalAmount - paidAmount);

        var slots = b.Details
            .OrderBy(d => d.PlayDate)
            .ThenBy(d => d.TimeSlot.StartTime)
            .ThenBy(d => d.Court.CourtName)
            .Select(d =>
            {
                var log = d.CheckInLogs.OrderByDescending(l => l.CheckInAt).FirstOrDefault();
                return new ReceptionBookingSlotDto(
                    BookingDetailId: d.Id,
                    CourtId: d.CourtId,
                    CourtName: d.Court?.CourtName ?? $"Sân #{d.CourtId}",
                    SportName: d.Court?.Sport?.SportName ?? "Thể thao",
                    PlayDate: d.PlayDate,
                    StartTime: d.TimeSlot.StartTime,
                    EndTime: d.TimeSlot.EndTime,
                    SlotPrice: d.SlotPrice,
                    CheckedIn: log is not null,
                    CheckInLogId: log?.Id,
                    CheckInAt: log?.CheckInAt,
                    CheckInChannel: log?.CheckInChannel.ToString(),
                    CheckedInByStaffName: log?.StaffUser?.FullName);
            })
            .ToList();

        var payments = b.PaymentTransactions
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ReceptionPaymentDto(
                TransactionId: p.Id,
                MethodName: p.PaymentMethod?.MethodName ?? (p.PaymentMethodId == 1 ? "Tiền mặt tại quầy" : "Chuyển khoản / VNPay"),
                TransactionType: p.TransactionType.ToString(),
                Amount: p.Amount,
                Status: p.Status.ToString(),
                ReferenceCode: p.ReferenceCode ?? p.ProviderTransactionId,
                CreatedAt: p.CreatedAt,
                ProcessedAt: p.ProcessedAt,
                VerifiedByStaffName: p.StaffVerifier?.FullName))
            .ToList();

        ReceptionPlayerProfileDto? playerDto = null;
        if (b.User is not null)
        {
            var p = b.User.PlayerProfile ?? await uow.CheckIns.GetOrCreatePlayerProfileAsync(b.User.Id);
            if (p is not null)
            {
                playerDto = new ReceptionPlayerProfileDto(
                    UserId: b.User.Id,
                    FullName: b.User.FullName,
                    Email: null,
                    PhoneNumber: b.User.PhoneNumber,
                    ReputationScore: p.ReputationScore,
                    SkillLevel: p.SkillLevel,
                    NumericSkillRating: p.NumericSkillRating,
                    TotalMatchesPlayed: p.TotalMatchesPlayed,
                    TotalNoShows: p.TotalNoShows,
                    LoyaltyPoints: p.LoyaltyPoints,
                    CurrentTier: p.CurrentTier);
            }
        }

        var loyaltyEarned = await uow.CheckIns.GetBookingLoyaltyPointsAsync(b.Id);
        var reputationDelta = await uow.CheckIns.GetBookingReputationDeltaAsync(b.Id);

        return new ReceptionBookingDetailDto(
            BookingId: b.Id,
            BookingCode: b.BookingCode,
            BookingStatus: b.BookingStatus.ToString(),
            CreatedAt: b.CreatedAt,
            UpdatedAt: b.UpdatedAt,
            HoldExpiresAt: b.HoldExpiresAt,
            FacilityId: facilityId,
            FacilityName: facilityName,
            CustomerType: customerType,
            CustomerName: customerName,
            CustomerPhone: customerPhone,
            CustomerEmail: null,
            CreatedByStaffName: b.CreatedByStaff?.FullName,
            TotalAmount: b.TotalAmount,
            DiscountAmount: b.DiscountAmount,
            FinalAmount: b.FinalAmount,
            PaidAmount: paidAmount,
            RemainingAmount: remainingAmount,
            TotalSlots: slots.Count,
            CheckedInSlots: slots.Count(s => s.CheckedIn),
            PlayerProfile: playerDto,
            Slots: slots,
            Payments: payments,
            CancelReason: b.Cancellation?.CancelReason,
            CancelledAt: b.Cancellation?.CancelledAt,
            RefundAmount: b.Cancellation?.RefundAmount,
            LoyaltyPointsEarned: loyaltyEarned,
            ReputationDeltaApplied: reputationDelta);
    }

    private async Task EnsureSameFacilityAsync(int facilityId, int staffUserId, bool isAdmin)
    {
        if (isAdmin) return;
        var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
        if (staffFacilityId != facilityId)
            throw new ForbiddenException("Bạn không được phân công ở cơ sở này.");
    }

    private static CheckInItem ToItem(BookingDetail d) => new(
        d.Id,
        d.BookingId,
        d.Booking.BookingCode,
        d.Booking.User?.FullName ?? d.Booking.GuestName ?? "Khách vãng lai",
        d.Booking.User?.PhoneNumber ?? d.Booking.GuestPhone,
        d.Court.CourtName,
        d.TimeSlot.StartTime,
        d.TimeSlot.EndTime,
        d.Booking.BookingStatus.ToString(),
        d.CheckInLogs.Count > 0,
        d.CheckInLogs.FirstOrDefault()?.CheckInAt);
}
