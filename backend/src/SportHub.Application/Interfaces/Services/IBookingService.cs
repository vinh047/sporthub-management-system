using SportHub.Application.DTOs.Booking;

namespace SportHub.Application.Interfaces.Services;

public interface IBookingService
{
    /// <summary>Giữ chỗ 10 phút với race condition protection</summary>
    Task<BookingResponse> HoldSlotAsync(HoldSlotRequest request, int? userId = null);
    Task<BookingResponse> ConfirmBookingAsync(int bookingId, ConfirmBookingRequest request);
    Task CancelBookingAsync(int bookingId, int cancelledByUserId, string reason);
    Task<IEnumerable<BookingResponse>> GetUserBookingsAsync(int userId);
    Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId);
}
