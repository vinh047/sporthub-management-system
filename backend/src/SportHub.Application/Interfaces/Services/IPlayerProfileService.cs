using SportHub.Application.DTOs.Player;

namespace SportHub.Application.Interfaces.Services;

public interface IPlayerProfileService
{
    // Lấy hồ sơ người chơi theo UserId
    Task<PlayerProfileResponse> GetByUserIdAsync(int userId);

    // Cập nhật thông tin hồ sơ người chơi
    Task<PlayerProfileResponse> UpdateAsync(
        int userId,
        UpdatePlayerProfileRequest request
    );
}