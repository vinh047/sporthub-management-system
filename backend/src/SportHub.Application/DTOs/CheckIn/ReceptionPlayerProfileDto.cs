namespace SportHub.Application.DTOs.CheckIn;

public record ReceptionPlayerProfileDto(
    int UserId,
    string FullName,
    string? Email,
    string? PhoneNumber,
    int ReputationScore,
    string SkillLevel,
    decimal NumericSkillRating,
    int TotalMatchesPlayed,
    int TotalNoShows,
    int LoyaltyPoints,
    string CurrentTier
);
