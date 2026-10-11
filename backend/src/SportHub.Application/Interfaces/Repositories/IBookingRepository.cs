using SportHub.Domain.Entities.Booking;

namespace SportHub.Application.Interfaces.Repositories;

public interface IBookingRepository : IRepository<Booking>
{
    Task<Booking?> GetByCodeAsync(string bookingCode);
    Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId);
    Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId);
}
