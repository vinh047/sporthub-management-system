namespace SportHub.Application.DTOs.Player;

// Dữ liệu người chơi được phép cập nhật
public record UpdatePlayerProfileRequest(
    string? SkillLevel
);

// Dữ liệu trả về cho giao diện
public record PlayerProfileResponse(
    int UserId,
    string FullName,
    string PhoneNumber,
    int ReputationScore,
    decimal NumericSkillRating,
    string SkillLevel,
    int TotalMatchesPlayed,
    int TotalNoShows,
    int LoyaltyPoints,
    string CurrentTier
);