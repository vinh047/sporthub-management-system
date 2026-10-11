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
}
