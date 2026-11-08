using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;

namespace SportHub.Application.Interfaces.Repositories;

public interface IBookingRepository : IRepository<Booking>
{
    Task<Booking?> GetByCodeAsync(string bookingCode);
    Task<Booking?> GetByIdWithDetailsAsync(int bookingId);
    Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId);
    Task<IReadOnlyList<TimeSlot>> GetTimeSlotsAsync(IReadOnlyCollection<int> timeSlotIds);
    Task LockSlotAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task<string> GetSlotStatusAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task<Booking?> GetForVoucherAsync(int bookingId);
}
