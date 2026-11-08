using SportHub.Domain.Entities.Facility;

namespace SportHub.Application.Interfaces.Repositories;

public interface ICourtRepository : IRepository<Court>
{
    Task<IEnumerable<Court>> GetAvailableCourtsAsync(
        int facilityId, int sportId, DateOnly date);
    Task<Court?> GetWithRelationsAsync(int id);
    Task<bool> CourtNamesExistAsync(int facilityId, IEnumerable<string> courtNames);
}
