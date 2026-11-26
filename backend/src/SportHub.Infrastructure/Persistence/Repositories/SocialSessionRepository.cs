using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Social;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class SocialSessionRepository(SportHubDbContext context)
    : Repository<SocialSession>(context), ISocialSessionRepository
{
    public async Task<IEnumerable<SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date)
    {
        var query = _dbSet.Where(s => s.FacilityId == facilityId && s.Status == "Published");
        if (date.HasValue)
            query = query.Where(s => s.PlayDate == date.Value);
        return await query.Include(s => s.Sport).Include(s => s.Participants).ToListAsync();
    }

    public async Task<IEnumerable<SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill)
    {
        var query = _dbSet.Where(s => s.Status == "Published");
        if (sportId.HasValue) query = query.Where(s => s.SportId == sportId.Value);
        if (minSkill.HasValue) query = query.Where(s => s.MinSkill >= minSkill.Value);
        if (maxSkill.HasValue) query = query.Where(s => s.MaxSkill <= maxSkill.Value);
        return await query.Include(s => s.Participants).ToListAsync();
    }

    public async Task<IEnumerable<SocialSession>> FilterAsync(int? sportId, int? facilityId, decimal? minSkill, decimal? maxSkill, DateOnly? date, bool publishedOnly = true)
    {
        var query = _dbSet.AsNoTracking().AsQueryable();
        if (publishedOnly) query = query.Where(s => s.Status == "Published");
        if (sportId.HasValue) query = query.Where(s => s.SportId == sportId.Value);
        if (facilityId.HasValue) query = query.Where(s => s.FacilityId == facilityId.Value);
        // Preserve the original range-filter semantics.
        if (minSkill.HasValue) query = query.Where(s => s.MinSkill >= minSkill.Value);
        if (maxSkill.HasValue) query = query.Where(s => s.MaxSkill <= maxSkill.Value);
        if (date.HasValue) query = query.Where(s => s.PlayDate == date.Value);
        return await query.Include(s => s.Participants).Include(s => s.SessionCourts)
            .OrderBy(s => s.PlayDate).ThenBy(s => s.StartTime).ToListAsync();
    }

    public Task<SocialSession?> GetDetailAsync(int id) => _dbSet
        .Include(s => s.Participants).Include(s => s.SessionCourts)
        .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<bool> HasCourtConflictAsync(int[] courtIds, DateOnly date, TimeOnly start, TimeOnly end, int? excludeId = null)
    {
        if (await _context.SocialSessionCourts.AnyAsync(c => courtIds.Contains(c.CourtId)
            && (!excludeId.HasValue || c.SessionId != excludeId.Value)
            && c.Session.PlayDate == date && c.Session.Status != "Cancelled"
            && c.Session.StartTime < end && start < c.Session.EndTime)) return true;
        if (await _context.CourtMaintenances.AnyAsync(c => courtIds.Contains(c.CourtId)
            && c.MaintenanceDate == date && c.StartTime < end && start < c.EndTime)) return true;
        return await _context.BookingDetails.AnyAsync(d => courtIds.Contains(d.CourtId)
            && d.PlayDate == date && d.TimeSlot.StartTime < end && start < d.TimeSlot.EndTime
            && (d.Booking.BookingStatus == SportHub.Domain.Enums.BookingStatus.Held
                || d.Booking.BookingStatus == SportHub.Domain.Enums.BookingStatus.Confirmed));
    }

    public void RemoveCourt(SocialSessionCourt court) => _context.SocialSessionCourts.Remove(court);
}
