using SportHub.Domain.Entities.Tournament;

namespace SportHub.Application.Interfaces.Repositories;

public interface ITournamentRepository : IRepository<Tournament>
{
    Task<IEnumerable<Tournament>> GetByFacilityAsync(int facilityId);
    Task<Tournament?> GetWithMatchesAsync(int tournamentId);
}
