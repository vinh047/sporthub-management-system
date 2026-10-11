using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class BookingRepository(SportHubDbContext context)
    : Repository<Booking>(context), IBookingRepository
{
    public async Task<Booking?> GetByCodeAsync(string code)
        => await _dbSet
            .Include(b => b.Details)
            .FirstOrDefaultAsync(b => b.BookingCode == code);

    public async Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public async Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        // Slot bị chiếm nếu có Booking ở trạng thái Held hoặc Confirmed
        var occupied = await _context.BookingDetails.AnyAsync(d =>
            d.CourtId == courtId &&
            d.PlayDate == playDate &&
            d.TimeSlotId == timeSlotId &&
            (d.Booking.BookingStatus == BookingStatus.Held ||
             d.Booking.BookingStatus == BookingStatus.Confirmed));

        // Slot bị khóa nếu có bảo trì
        var maintenance = await _context.CourtMaintenances.AnyAsync(m =>
            m.CourtId == courtId &&
            m.MaintenanceDate == playDate);

        return !occupied && !maintenance;
    }
}
