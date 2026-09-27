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
    string AccessToken,
    DateTime ExpiresAt
);
