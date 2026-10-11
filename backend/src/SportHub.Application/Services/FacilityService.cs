using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class FacilityService(IUnitOfWork uow) : IFacilityService
{
    public Task<FacilityResponse> CreateFacilityAsync(CreateFacilityRequest request) => throw new NotImplementedException();
    public Task<FacilityResponse> UpdateFacilityAsync(int id, UpdateFacilityRequest request) => throw new NotImplementedException();
    public Task<IEnumerable<FacilityResponse>> GetAllFacilitiesAsync(bool activeOnly = true) => throw new NotImplementedException();
    public Task<FacilityDetailResponse> GetFacilityDetailAsync(int id) => throw new NotImplementedException();
    public Task SetFacilityActiveAsync(int id, bool isActive) => throw new NotImplementedException();
}
