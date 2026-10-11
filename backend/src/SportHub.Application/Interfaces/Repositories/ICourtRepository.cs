using SportHub.Domain.Entities.Facility;

namespace SportHub.Application.Interfaces.Repositories;

public interface ICourtRepository : IRepository<Court>
{
    Task<IEnumerable<Court>> GetAvailableCourtsAsync(
        int facilityId, int sportId, DateOnly date);
}
