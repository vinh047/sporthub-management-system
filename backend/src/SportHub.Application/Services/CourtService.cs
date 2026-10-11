using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class CourtService(IUnitOfWork uow) : ICourtService
{
    public Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request) => throw new NotImplementedException();
    public Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(int facilityId, int sportId, DateOnly date) => throw new NotImplementedException();
    public Task LockCourtForMaintenanceAsync(LockCourtRequest request) => throw new NotImplementedException();
}
