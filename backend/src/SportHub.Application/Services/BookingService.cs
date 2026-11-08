using System.Data;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class BookingService(
    IUnitOfWork uow,
    IPricingService pricing,
    ICourtStatusNotifier courtStatusNotifier) : IBookingService
{
    private static TimeZoneInfo BookingTimeZone =>
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    public async Task<BookingResponse> HoldSlotAsync(HoldSlotRequest request, int? userId = null)
    {
        ValidateHoldRequest(request);
        var requestedSlotIds = request.TimeSlotIds ?? [request.TimeSlotId];
        if (requestedSlotIds.Count is < 1 or > 24 ||
            requestedSlotIds.Any(slotId => slotId <= 0) ||
            requestedSlotIds.Distinct().Count() != requestedSlotIds.Count)
            throw new ValidationException(["Danh sách khung giờ không hợp lệ."]);

        var slots = await uow.Bookings.GetTimeSlotsAsync(requestedSlotIds);
        if (slots.Count != requestedSlotIds.Count)
            throw new ValidationException(["Một hoặc nhiều khung giờ không tồn tại."]);
        for (var index = 1; index < slots.Count; index++)
        {
            if (slots[index - 1].EndTime != slots[index].StartTime)
                throw new ValidationException(["Các khung giờ phải liền nhau trên cùng một sân."]);
        }

        var bookingNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BookingTimeZone);
        var slotStart = request.PlayDate.ToDateTime(slots[0].StartTime);
        if (slotStart <= bookingNow)
            throw new ValidationException(["Không thể giữ chỗ cho khung giờ đã bắt đầu."]);

        var prices = await pricing.GetSlotPricesAsync(request.CourtId, request.PlayDate);
        if (slots.Any(slot => !prices.ContainsKey(slot.Id)))
            throw new ValidationException(["Không tìm thấy giá cho một hoặc nhiều khung giờ đã chọn."]);
        var details = slots.Select(slot => new BookingDetail
        {
            CourtId = request.CourtId,
            PlayDate = request.PlayDate,
            TimeSlotId = slot.Id,
            SlotPrice = prices[slot.Id]
        }).ToList();
        var totalPrice = details.Sum(detail => detail.SlotPrice);
        var holdExpiresAt = DateTime.UtcNow.AddMinutes(10);
        var booking = new Booking
        {
            BookingCode = GenerateBookingCode(),
            UserId = userId,
            GuestName = request.GuestName,
            GuestPhone = request.GuestPhone,
            TotalAmount = totalPrice,
            DiscountAmount = 0,
            FinalAmount = totalPrice,
            BookingStatus = BookingStatus.Held,
            HoldExpiresAt = holdExpiresAt,
            Details = details
        };

        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            foreach (var slot in slots)
            {
                await uow.Bookings.LockSlotAsync(request.CourtId, request.PlayDate, slot.Id);
                var status = await uow.Bookings.GetSlotStatusAsync(request.CourtId, request.PlayDate, slot.Id);
                if (status == "Unavailable")
                    throw new ValidationException(["Sân không hoạt động hoặc khung giờ không tồn tại."]);
                if (status != "Available")
                    throw new ConflictException("Một hoặc nhiều khung giờ vừa được người khác giữ chỗ. Vui lòng chọn lại.");
            }

            await uow.Bookings.AddAsync(booking);
            await uow.SaveChangesAsync();
            var createdBooking = await uow.Bookings.GetByIdWithDetailsAsync(booking.Id)
                ?? throw new InvalidOperationException("Booking vừa lưu nhưng không thể đọc lại.");
            await uow.CommitTransactionAsync();

            foreach (var detail in createdBooking.Details)
            {
                await courtStatusNotifier.NotifySlotUpdatedAsync(
                    detail.Court.FacilityId,
                    detail.CourtId,
                    detail.PlayDate,
                    detail.TimeSlotId,
                    "Held");
            }

            return MapToResponse(createdBooking);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<IEnumerable<BookingResponse>> GetUserBookingsAsync(int userId)
    {
        var bookings = await uow.Bookings.GetUserBookingsAsync(userId);
        return bookings.Select(MapToResponse);
    }

    public async Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId, int userId)
    {
        var booking = await uow.Bookings.GetByIdWithDetailsAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId.ToString());
        if (booking.UserId != userId)
            throw new ForbiddenException("Bạn không có quyền xem đơn đặt sân này.");

        return MapToDetailResponse(booking);
    }

    public async Task CancelBookingAsync(int bookingId, int cancelledByUserId, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ValidationException(["Vui lòng cung cấp lý do hủy."]);

        Booking booking;
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            booking = await uow.Bookings.GetByIdWithDetailsAsync(bookingId)
                ?? throw new NotFoundException("Đơn đặt sân", bookingId.ToString());
            EnsureOwner(booking, cancelledByUserId);

            if (booking.BookingStatus == BookingStatus.Cancelled)
            {
                await uow.CommitTransactionAsync();
                return;
            }

            if (booking.BookingStatus is not (BookingStatus.Held or BookingStatus.Confirmed))
                throw new ConflictException("Không thể hủy đơn đã hoàn thành hoặc bị đánh dấu vắng mặt.");

            var wasConfirmed = booking.BookingStatus == BookingStatus.Confirmed;
            var firstPlayTime = booking.Details
                .Min(detail => detail.PlayDate.ToDateTime(detail.TimeSlot.StartTime));
            var bookingNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BookingTimeZone);
            var timeUntilPlay = firstPlayTime - bookingNow;
            if (timeUntilPlay <= TimeSpan.Zero)
                throw new ConflictException("Không thể hủy đơn đã đến giờ chơi.");

            var refundPercent = wasConfirmed
                ? timeUntilPlay.TotalHours switch
                {
                    >= 24 => 100m,
                    >= 6 => 50m,
                    _ => 0m
                }
                : 0m;
            var refundAmount = decimal.Round(booking.FinalAmount * refundPercent / 100m, 2);

            booking.BookingStatus = BookingStatus.Cancelled;
            booking.Cancellation = new BookingCancellation
            {
                CancelledByUserId = cancelledByUserId,
                CancelledAt = DateTime.UtcNow,
                CancelReason = reason.Trim(),
                RefundPercent = refundPercent,
                RefundAmount = refundAmount,
                PenaltyAmount = booking.FinalAmount - refundAmount,
                RefundStatus = refundAmount > 0m ? RefundStatus.Pending : RefundStatus.NotRequired
            };

            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }

        foreach (var detail in booking.Details)
        {
            var status = await uow.Bookings.GetSlotStatusAsync(detail.CourtId, detail.PlayDate, detail.TimeSlotId);
            await courtStatusNotifier.NotifySlotUpdatedAsync(
                detail.Court.FacilityId,
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId,
                status);
        }
    }

    private static string GenerateBookingCode()
        => $"BK{Guid.NewGuid():N}"[..20];

    private static void ValidateHoldRequest(HoldSlotRequest request)
    {
        if (request.CourtId <= 0 || (request.TimeSlotId <= 0 && request.TimeSlotIds is null))
            throw new ValidationException(["Sân và khung giờ không hợp lệ."]);
        var bookingDate = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BookingTimeZone));
        if (request.PlayDate < bookingDate)
            throw new ValidationException(["Ngày đặt sân không hợp lệ."]);
    }

    private static void EnsureOwner(Booking booking, int userId)
    {
        if (booking.UserId != userId)
            throw new ForbiddenException("Bạn không có quyền thao tác trên đơn đặt sân này.");
    }

    private static BookingResponse MapToResponse(Booking b)
    {
        var details = b.Details
            .OrderBy(d => d.TimeSlot?.StartTime)
            .Select(d => new BookingDetailDto(
            d.Id,
            d.CourtId,
            d.Court?.CourtName ?? $"Sân #{d.CourtId}",
            d.Court?.Facility?.Name ?? "SportHub",
            d.PlayDate,
            d.TimeSlot?.StartTime ?? new TimeOnly(6, 0),
            d.TimeSlot?.EndTime ?? new TimeOnly(7, 0),
            d.SlotPrice
        )).ToList();

        var payment = b.PaymentTransactions
            .Where(transaction => transaction.TransactionType == PaymentTransactionType.Payment)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefault();
        var refund = b.PaymentTransactions
            .Where(transaction => transaction.TransactionType == PaymentTransactionType.Refund)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefault();
        var refundStatus = refund?.Status switch
        {
            PaymentStatus.Confirmed => RefundStatus.Processing,
            PaymentStatus.Pending => RefundStatus.Processing,
            PaymentStatus.Failed => RefundStatus.Failed,
            PaymentStatus.Refunded => RefundStatus.Completed,
            _ => b.Cancellation?.RefundStatus
        };

        return new BookingResponse(
            b.Id,
            b.BookingCode,
            b.BookingStatus.ToString(),
            b.FinalAmount,
            b.HoldExpiresAt,
            details,
            payment?.Status.ToString(),
            refundStatus?.ToString(),
            refund?.Amount ?? b.Cancellation?.RefundAmount
        );
    }

    private static BookingDetailResponse MapToDetailResponse(Booking b)
    {
        var details = b.Details
            .OrderBy(d => d.TimeSlot?.StartTime)
            .Select(d => new BookingDetailDto(
            d.Id,
            d.CourtId,
            d.Court?.CourtName ?? $"Sân #{d.CourtId}",
            d.Court?.Facility?.Name ?? "SportHub",
            d.PlayDate,
            d.TimeSlot?.StartTime ?? new TimeOnly(6, 0),
            d.TimeSlot?.EndTime ?? new TimeOnly(7, 0),
            d.SlotPrice
        )).ToList();

        var payments = b.PaymentTransactions.Select(p => new PaymentSummary(
            p.Id,
            p.TransactionType == PaymentTransactionType.Refund
                ? "Hoàn tiền VNPay"
                : p.PaymentMethod?.MethodName ?? "VietQR",
            p.Amount,
            p.Status.ToString(),
            p.CreatedAt
        )).ToList();

        return new BookingDetailResponse(
            b.Id,
            b.BookingCode,
            b.BookingStatus.ToString(),
            b.FinalAmount,
            b.User?.FullName,
            b.GuestName,
            b.GuestPhone,
            details,
            payments
        );
    }
}
