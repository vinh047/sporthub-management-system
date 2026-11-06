using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Facility;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class FacilityRepository(SportHubDbContext context)
    : Repository<Facility>(context), IFacilityRepository
{
    public Task<IEnumerable<Facility>> GetFacilitiesAsync(bool activeOnly)
    {
        IQueryable<Facility> query = _dbSet.Include(f => f.Courts).ThenInclude(c => c.Sport);
        if (activeOnly)
            query = query.Where(f => f.IsActive);

        return query.OrderBy(f => f.Name).ToListAsync()
            .ContinueWith(task => (IEnumerable<Facility>)task.Result);
    }

    public Task<Facility?> GetWithCourtsAsync(int id)
        => _dbSet.Include(f => f.Courts).ThenInclude(c => c.Sport)
            .FirstOrDefaultAsync(f => f.Id == id);

    public Task<IEnumerable<TimeSlot>> GetTimeSlotsAsync()
        => _context.TimeSlots.OrderBy(s => s.SlotIndex).ToListAsync()
            .ContinueWith(task => (IEnumerable<TimeSlot>)task.Result);

    public Task<PricePolicy?> GetPricePolicyAsync(int facilityId, int sportId, DateOnly playDate)
        => _context.PricePolicies
            .Include(p => p.PriceRuleDetails)
            .Where(p => p.FacilityId == facilityId && p.SportId == sportId &&
                        p.IsActive && p.EffectiveFrom <= playDate)
            .OrderByDescending(p => p.EffectiveFrom)
            .FirstOrDefaultAsync();

    public Task<bool> HasMaintenanceOverlapAsync(
        int courtId, DateOnly date, TimeOnly start, TimeOnly end)
        => _context.CourtMaintenances.AnyAsync(m =>
            m.CourtId == courtId && m.MaintenanceDate == date &&
            m.StartTime < end && start < m.EndTime);

    public Task AddMaintenanceAsync(CourtMaintenance maintenance)
        => _context.CourtMaintenances.AddAsync(maintenance).AsTask();

    public Task AddPricePolicyAsync(PricePolicy policy)
        => _context.PricePolicies.AddAsync(policy).AsTask();
}
