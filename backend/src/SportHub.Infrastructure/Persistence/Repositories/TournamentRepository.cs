using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class TournamentRepository(SportHubDbContext context)
    : Repository<Tournament>(context), ITournamentRepository
{
    public async Task<IEnumerable<Tournament>> GetByFacilityAsync(int facilityId)
        => await _dbSet.Where(t => t.FacilityId == facilityId)
            .Include(t => t.Sport)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();

    public async Task<Tournament?> GetWithMatchesAsync(int tournamentId)
        => await _dbSet
            .Include(t => t.Teams).ThenInclude(team => team.Athletes)
            .Include(t => t.Matches)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);
}
