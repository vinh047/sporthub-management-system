using SportHub.Application.DTOs.Facility;

namespace SportHub.Application.Interfaces.Services;

public interface ICourtService
{
    Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request);
    Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(
        int facilityId, int sportId, DateOnly date);
    Task LockCourtForMaintenanceAsync(LockCourtRequest request);
}
