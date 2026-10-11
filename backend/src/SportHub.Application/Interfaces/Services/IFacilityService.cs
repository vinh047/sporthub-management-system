using SportHub.Application.DTOs.Facility;

namespace SportHub.Application.Interfaces.Services;

public interface IFacilityService
{
    Task<FacilityResponse> CreateFacilityAsync(CreateFacilityRequest request);
    Task<FacilityResponse> UpdateFacilityAsync(int id, UpdateFacilityRequest request);
    Task<IEnumerable<FacilityResponse>> GetAllFacilitiesAsync(bool activeOnly = true);
    Task<FacilityDetailResponse> GetFacilityDetailAsync(int id);
    Task SetFacilityActiveAsync(int id, bool isActive);
}
