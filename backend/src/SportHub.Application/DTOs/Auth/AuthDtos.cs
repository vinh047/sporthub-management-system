namespace SportHub.Application.DTOs.Auth;

// --- Request ---

public record RegisterRequest(
    string FullName,
    string PhoneNumber,
    string Password,
    string ConfirmPassword
);

public record LoginRequest(
    string PhoneNumber,
    string Password
);

public record UpdateSportProfileRequest(
    List<SportPreference> Sports
);

public record SportPreference(
    int SportId,
    string SkillLevel   // Beginner, Intermediate, Advanced, Professional
);

// --- Response ---

public record AuthResponse(
    int UserId,
    string FullName,
    string PhoneNumber,
    string Role,
    int? FacilityId,        // Cơ sở của Staff, null với Player/Admin
    string AccessToken,
    DateTime ExpiresAt,
    string? AvatarUrl
);

public record MeResponse(
    int UserId,
    string FullName,
    string PhoneNumber,
    string Role,
    int? FacilityId,
    PlayerSummary? Player,    // null nếu không phải người chơi
    string? AvatarUrl   
);

public record PlayerSummary(
    int ReputationScore,
    decimal SkillRating,
    string SkillLevel,
    int LoyaltyPoints,
    string Tier,
    int TotalMatchesPlayed
);

public record UpdateAccountRequest(
    string? FullName,
    string? PhoneNumber
);

public record ChangePasswordRequest(
    string? CurrentPassword,
    string? NewPassword,
    string? ConfirmNewPassword
);
