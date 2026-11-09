using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class TournamentRepository(SportHubDbContext context)
    : Repository<Tournament>(context), ITournamentRepository
{
    public async Task<List<Tournament>> GetByParticipantAsync(int userId)
        => await _dbSet.AsNoTracking()
            .Where(t => t.Teams.Any(team => team.Athletes.Any(a => a.UserId == userId)))
            .Include(t => t.Facility)
            .Include(t => t.Sport)
            .Include(t => t.Teams).ThenInclude(team => team.Athletes).ThenInclude(a => a.User).ThenInclude(u => u.PlayerProfile)
            .Include(t => t.Matches).ThenInclude(m => m.Court)
            .Include(t => t.Matches).ThenInclude(m => m.Team1)
            .Include(t => t.Matches).ThenInclude(m => m.Team2)
            .AsSplitQuery()
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Tournament>> GetByFacilityAsync(int facilityId)
        => await _dbSet
            .AsNoTracking()
            .Where(t => t.FacilityId == facilityId)
            .Include(t => t.Facility)
            .Include(t => t.Sport)
            .Include(t => t.Teams)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();

    public async Task<List<Tournament>> GetFilteredAsync(int? facilityId, int? sportId, string? status)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(t => t.Facility)
            .Include(t => t.Sport)
            .Include(t => t.Teams)
            .AsQueryable();

        if (facilityId.HasValue)
            query = query.Where(t => t.FacilityId == facilityId.Value);

        if (sportId.HasValue)
            query = query.Where(t => t.SportId == sportId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status.Trim());

        return await query
            .OrderByDescending(t => t.StartDate)
            .ThenByDescending(t => t.Id)
            .ToListAsync();
    }

    public async Task<Tournament?> GetWithMatchesAsync(int tournamentId)
        => await _dbSet
            .Include(t => t.Teams).ThenInclude(team => team.Athletes)
            .Include(t => t.Matches).ThenInclude(m => m.Sets)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

    public async Task<Tournament?> GetByIdWithDetailsAsync(int tournamentId, bool asNoTracking = false)
    {
        var query = _dbSet.AsQueryable();
        if (asNoTracking)
            query = query.AsNoTracking();

        return await query
            .Include(t => t.Facility)
            .Include(t => t.Sport)
            .Include(t => t.Teams).ThenInclude(team => team.Athletes).ThenInclude(a => a.User).ThenInclude(u => u.PlayerProfile)
            .Include(t => t.Matches).ThenInclude(m => m.Court)
            .Include(t => t.Matches).ThenInclude(m => m.Team1)
            .Include(t => t.Matches).ThenInclude(m => m.Team2)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);
    }

    public async Task AddTeamAsync(TournamentTeam team)
        => await _context.TournamentTeams.AddAsync(team);
}
