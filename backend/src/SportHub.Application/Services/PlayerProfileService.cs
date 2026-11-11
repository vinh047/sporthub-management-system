using SportHub.Application.DTOs.Player;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PlayerProfileService(
    IUnitOfWork uow,
    IAvatarStorage avatarStorage
) : IPlayerProfileService

{
    private static readonly string[] AllowedSkillLevels =
    [
        "Beginner",
        "Intermediate",
        "Advanced",
        "Pro"
    ];

    // Lấy hồ sơ người chơi
    public async Task<PlayerProfileResponse> GetByUserIdAsync(int userId)
    {
        var profile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        if (profile == null)
        {
            throw new NotFoundException("Hồ sơ người chơi", userId);
        }

        return MapToResponse(profile);
    }

    // Cập nhật hồ sơ người chơi
    public async Task<PlayerProfileResponse> UpdateAsync(
        int userId,
        UpdatePlayerProfileRequest request)
    {
        var profile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        if (profile == null)
        {
            throw new NotFoundException("Hồ sơ người chơi", userId);
        }

        var skillLevel = request.SkillLevel?.Trim();

        if (string.IsNullOrWhiteSpace(skillLevel))
        {
            throw new ArgumentException("Trình độ người chơi không được để trống.");
        }

        if (!AllowedSkillLevels.Contains(skillLevel))
        {
            throw new ArgumentException(
                "Trình độ phải là Beginner, Intermediate, Advanced hoặc Pro.");
        }

        profile.SkillLevel = skillLevel;

        await uow.SaveChangesAsync();

        var updatedProfile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        return MapToResponse(updatedProfile!);
    }

    // Chuyển Entity thành DTO
    private static PlayerProfileResponse MapToResponse(PlayerProfile profile)
    {
        return new PlayerProfileResponse(
            profile.UserId,
            profile.User.FullName,
            profile.User.PhoneNumber,
            profile.ReputationScore,
            profile.NumericSkillRating,
            profile.SkillLevel,
            profile.TotalMatchesPlayed,
            profile.TotalNoShows,
            profile.LoyaltyPoints,
            profile.CurrentTier,
            profile.User.AvatarUrl,
            profile.User.IsActive

        );
    }

    // Thay đổi ảnh đại diện
    public async Task<PlayerProfileResponse> UpdateAvatarAsync(
        int userId,
        Stream fileStream,
        string extension)
    {
        var user = await uow.Users.GetWithProfileAsync(userId);

        if (user == null || user.PlayerProfile == null)
        {
            throw new NotFoundException("Hồ sơ người chơi", userId);
        }

        var oldAvatarUrl = user.AvatarUrl;
        var newAvatarUrl = await avatarStorage.SaveAsync(
            fileStream,
            extension,
            userId
        );

        try
        {
            user.AvatarUrl = newAvatarUrl;

            uow.Users.Update(user);

            await uow.SaveChangesAsync();
        }
        catch
        {
            await avatarStorage.DeleteAsync(newAvatarUrl);
            throw;
        }

        // Chỉ xóa ảnh cũ sau khi cập nhật database thành công.
        if (!string.IsNullOrWhiteSpace(oldAvatarUrl))
        {
            await avatarStorage.DeleteAsync(oldAvatarUrl);
        }

        var updatedProfile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        return MapToResponse(updatedProfile!);
    }

    // Xóa ảnh đại diện
    public async Task<PlayerProfileResponse> RemoveAvatarAsync(int userId)
    {
        var user = await uow.Users.GetWithProfileAsync(userId);

        if (user == null || user.PlayerProfile == null)
        {
            throw new NotFoundException("Hồ sơ người chơi", userId);
        }

        var oldAvatarUrl = user.AvatarUrl;

        user.AvatarUrl = null;

        uow.Users.Update(user);

        await uow.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(oldAvatarUrl))
        {
            await avatarStorage.DeleteAsync(oldAvatarUrl);
        }

        var updatedProfile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        return MapToResponse(updatedProfile!);
    }

    // Admin lấy danh sách tất cả người chơi
    public async Task<IEnumerable<PlayerProfileResponse>> GetAllAsync()
    {
        var profiles = await uow.PlayerProfiles.GetAllWithUserAsync();

        return profiles.Select(MapToResponse);
    }

    // Admin khóa hoặc mở khóa tài khoản người chơi
    public async Task<PlayerProfileResponse> UpdateStatusAsync(
        int userId,
        UpdatePlayerStatusRequest request)
    {
        var user = await uow.Users.GetWithProfileAsync(userId);

        if (user == null || user.PlayerProfile == null)
        {
            throw new NotFoundException("Hồ sơ người chơi", userId);
        }

        user.IsActive = request.IsActive;

        uow.Users.Update(user);

        await uow.SaveChangesAsync();

        var updatedProfile = await uow.PlayerProfiles.GetByUserIdAsync(userId);

        return MapToResponse(updatedProfile!);
    }
}