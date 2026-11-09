using SportHub.Domain.Entities.Tournament;

namespace SportHub.Application.Interfaces.Repositories;

public interface ITournamentRepository : IRepository<Tournament>
{
    Task<IEnumerable<Tournament>> GetByFacilityAsync(int facilityId);
    Task<List<Tournament>> GetFilteredAsync(int? facilityId, int? sportId, string? status);
    Task<Tournament?> GetWithMatchesAsync(int tournamentId);
    Task<Tournament?> GetByIdWithDetailsAsync(int tournamentId, bool asNoTracking = false);
    Task AddTeamAsync(TournamentTeam team);
}
