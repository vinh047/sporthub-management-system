
using SportHub.Application.DTOs.Player;

namespace SportHub.Application.Interfaces.Services;

public interface IPlayerProfileService
{
    // Admin lấy danh sách tất cả người chơi
    Task<IEnumerable<PlayerProfileResponse>> GetAllAsync();

    // Lấy hồ sơ người chơi theo UserId
    Task<PlayerProfileResponse> GetByUserIdAsync(int userId);

    // Cập nhật hồ sơ người chơi
    Task<PlayerProfileResponse> UpdateAsync(
        int userId,
        UpdatePlayerProfileRequest request
    );

    // Cập nhật ảnh đại diện
    Task<PlayerProfileResponse> UpdateAvatarAsync(
        int userId,
        Stream fileStream,
        string extension
    );

    // Xóa ảnh đại diện
    Task<PlayerProfileResponse> RemoveAvatarAsync(int userId);

    // Admin khóa hoặc mở khóa tài khoản người chơi
    Task<PlayerProfileResponse> UpdateStatusAsync(
        int userId,
        UpdatePlayerStatusRequest request
    );
}
