using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Enums;
using SportHub.Infrastructure.Persistence.Seed;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class BookingRepository(SportHubDbContext context)
    : Repository<Booking>(context), IBookingRepository
{
    public async Task<Booking?> GetByCodeAsync(string code)
        => await _dbSet
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .Include(b => b.Details).ThenInclude(d => d.TimeSlot)
            .Include(b => b.PaymentTransactions)
            .FirstOrDefaultAsync(b => b.BookingCode == code);

    public Task<Booking?> GetForVoucherAsync(int bookingId)
        => _dbSet.Include(b => b.Details).ThenInclude(d => d.TimeSlot)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

    public async Task<Booking?> GetByIdWithDetailsAsync(int id)
        => await _dbSet
            .Include(b => b.User)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .Include(b => b.Details).ThenInclude(d => d.TimeSlot)
            .Include(b => b.PaymentTransactions).ThenInclude(p => p.PaymentMethod)
            .Include(b => b.Cancellation)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IEnumerable<Booking>> GetUserBookingsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .Include(b => b.Details).ThenInclude(d => d.TimeSlot)
            .Include(b => b.PaymentTransactions).ThenInclude(p => p.PaymentMethod)
            .Include(b => b.Cancellation)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public async Task<IReadOnlyList<Domain.Entities.Facility.TimeSlot>> GetTimeSlotsAsync(
        IReadOnlyCollection<int> timeSlotIds)
    {
        await DataSeeder.EnsureSchemaUpToDateAsync(_context);
        return await _context.TimeSlots
            .AsNoTracking()
            .Where(slot => timeSlotIds.Contains(slot.Id) || timeSlotIds.Contains(slot.SlotIndex))
            .OrderBy(slot => slot.StartTime)
            .ToListAsync();
    }

    public async Task LockSlotAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        _ = await _context.Database
            .SqlQuery<int>(
                $"SELECT 1 AS [Value] FROM [BookingDetails] WITH (UPDLOCK, HOLDLOCK) WHERE [CourtId] = {courtId} AND [PlayDate] = {playDate} AND [TimeSlotId] = {timeSlotId}")
            .ToListAsync();
    }

    public async Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        return await GetSlotStatusAsync(courtId, playDate, timeSlotId) == "Available";
    }

    public async Task<string> GetSlotStatusAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        var courtIsActive = await _context.Courts
            .AsNoTracking()
            .AnyAsync(court => court.Id == courtId && court.IsActive);
        if (!courtIsActive) return "Unavailable";

        var slot = await _context.TimeSlots
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == timeSlotId || s.SlotIndex == timeSlotId);
        if (slot is null) return "Unavailable";

        var now = DateTime.UtcNow;
        var occupiedStatus = await _context.BookingDetails
            .Where(d =>
            d.CourtId == courtId &&
            d.PlayDate == playDate &&
            d.TimeSlotId == slot.Id &&
            ((d.Booking.BookingStatus == BookingStatus.Held &&
                (d.Booking.HoldExpiresAt == null || d.Booking.HoldExpiresAt > now)) ||
             d.Booking.BookingStatus == BookingStatus.Confirmed ||
             d.Booking.BookingStatus == BookingStatus.Completed))
            .OrderByDescending(d => d.Booking.BookingStatus != BookingStatus.Held)
            .Select(d => d.Booking.BookingStatus == BookingStatus.Held ? "Held" : "Confirmed")
            .FirstOrDefaultAsync();
        if (occupiedStatus is not null) return occupiedStatus;

        // 2. Bảo trì chỉ khóa phần thời gian giao nhau với slot.
        var maintenance = await _context.CourtMaintenances.AnyAsync(m =>
            m.CourtId == courtId &&
            m.MaintenanceDate == playDate &&
            m.StartTime < slot.EndTime &&
            m.EndTime > slot.StartTime);
        if (maintenance) return "Maintenance";

        var socialConflict = await _context.SocialSessionCourts.AnyAsync(sc =>
            sc.CourtId == courtId &&
            sc.Session.PlayDate == playDate &&
            (sc.Session.Status == "Published" || sc.Session.Status == "InProgress") &&
            sc.Session.StartTime < slot.EndTime &&
            sc.Session.EndTime > slot.StartTime);
        if (socialConflict) return "Social";

        var slotStart = playDate.ToDateTime(slot.StartTime);
        var slotEnd = playDate.ToDateTime(slot.EndTime);
        var tournamentConflict = await _context.TournamentMatches.AnyAsync(match =>
            match.CourtId == courtId &&
            match.ScheduledStartTime.HasValue &&
            match.ScheduledStartTime.Value >= slotStart.AddHours(-1) &&
            match.ScheduledStartTime.Value < slotEnd);
        if (tournamentConflict) return "Social";

        return "Available";
    }
}
