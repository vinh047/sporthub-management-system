
using SportHub.Application.DTOs.Staff;

namespace SportHub.Application.Interfaces.Services;

public interface IStaffProfileService
{
    Task<IEnumerable<StaffProfileResponse>> GetAllAsync();

    Task<StaffProfileResponse> GetByUserIdAsync(int userId);

    Task<StaffProfileResponse> CreateAsync(CreateStaffProfileRequest request);

    Task<StaffProfileResponse> UpdateAsync(
        int userId,
        UpdateStaffProfileRequest request);

    Task DeleteAsync(int userId);
}
