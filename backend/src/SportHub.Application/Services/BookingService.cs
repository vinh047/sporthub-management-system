using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class BookingService(IUnitOfWork uow, IPricingService pricing) : IBookingService
{
    public Task<BookingResponse> HoldSlotAsync(HoldSlotRequest request, int? userId = null) => throw new NotImplementedException();
    public Task<BookingResponse> ConfirmBookingAsync(int bookingId, ConfirmBookingRequest request) => throw new NotImplementedException();
    public Task CancelBookingAsync(int bookingId, int cancelledByUserId, string reason) => throw new NotImplementedException();
    public Task<IEnumerable<BookingResponse>> GetUserBookingsAsync(int userId) => throw new NotImplementedException();
    public Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId) => throw new NotImplementedException();
}
