namespace SportHub.Application.DTOs.Tournament;

public record TournamentAthleteDto(
    int Id,
    int UserId,
    string FullName,
    string PhoneNumber,
    bool IsCaptain,
    decimal? SkillRating,
    string? SkillLevel
);
