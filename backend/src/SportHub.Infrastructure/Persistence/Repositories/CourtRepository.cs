using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Facility;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class CourtRepository(SportHubDbContext context)
    : Repository<Court>(context), ICourtRepository
{
    public async Task<IEnumerable<Court>> GetAvailableCourtsAsync(
        int facilityId, int sportId, DateOnly date)
        => await _dbSet
            .Where(c => c.FacilityId == facilityId && c.SportId == sportId && c.IsActive)
            .Include(c => c.Sport)
            .ToListAsync();

    public Task<Court?> GetWithRelationsAsync(int id)
        => _dbSet.Include(c => c.Sport).Include(c => c.Facility)
            .FirstOrDefaultAsync(c => c.Id == id);

    public Task<bool> CourtNamesExistAsync(int facilityId, IEnumerable<string> courtNames)
    {
        var names = courtNames.ToArray();
        return _dbSet.AnyAsync(c => c.FacilityId == facilityId && names.Contains(c.CourtName));
    }
}
