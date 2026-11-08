using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Facility;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class FacilityRepository(SportHubDbContext context)
    : Repository<Facility>(context), IFacilityRepository
{
    public async Task<IEnumerable<Facility>> GetFacilitiesAsync(bool activeOnly)
    {
        IQueryable<Facility> query = _dbSet.Include(f => f.Courts).ThenInclude(c => c.Sport);
        if (activeOnly)
            query = query.Where(f => f.IsActive);

        return await query.OrderBy(f => f.Name).ToListAsync();
    }

    public Task<Facility?> GetWithCourtsAsync(int id)
        => _dbSet.Include(f => f.Courts).ThenInclude(c => c.Sport)
            .FirstOrDefaultAsync(f => f.Id == id);

    public async Task<IEnumerable<TimeSlot>> GetTimeSlotsAsync()
        => await _context.TimeSlots.OrderBy(s => s.SlotIndex).ToListAsync();

    public async Task<IEnumerable<Sport>> GetActiveSportsAsync()
        => await _context.Sports.Where(s => s.IsActive)
            .OrderBy(s => s.SportName).ToListAsync();

    public async Task<IEnumerable<Sport>> GetSportsAsync(bool activeOnly)
    {
        IQueryable<Sport> query = _context.Sports;
        if (activeOnly)
            query = query.Where(s => s.IsActive);
        return await query.OrderBy(s => s.SportName).ToListAsync();
    }

    public Task<Sport?> GetSportByIdAsync(int id)
        => _context.Sports.FirstOrDefaultAsync(s => s.Id == id && s.IsActive);

    public Task<Sport?> GetSportEntityByIdAsync(int id)
        => _context.Sports.FirstOrDefaultAsync(s => s.Id == id);

    public Task AddSportAsync(Sport sport)
        => _context.Sports.AddAsync(sport).AsTask();

    public Task<PricePolicy?> GetPricePolicyAsync(int facilityId, int sportId, DateOnly playDate)
        => _context.PricePolicies
            .Include(p => p.PriceRuleDetails)
            .Where(p => p.FacilityId == facilityId && p.SportId == sportId &&
                        p.IsActive && p.EffectiveFrom <= playDate)
            .OrderByDescending(p => p.EffectiveFrom)
            .FirstOrDefaultAsync();

    public Task<PricePolicy?> GetPricePolicyByEffectiveDateAsync(
        int facilityId, int sportId, DateOnly effectiveFrom)
        => _context.PricePolicies.Include(p => p.PriceRuleDetails)
            .FirstOrDefaultAsync(p => p.FacilityId == facilityId &&
                p.SportId == sportId && p.EffectiveFrom == effectiveFrom);

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
