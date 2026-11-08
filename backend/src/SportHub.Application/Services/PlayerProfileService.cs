using SportHub.Application.DTOs.Player;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PlayerProfileService(IUnitOfWork uow)
    : IPlayerProfileService
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
            profile.CurrentTier
        );
    }
}