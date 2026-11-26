namespace SportHub.Application.DTOs.Tournament;

public record TournamentDto(
    int Id,
    int FacilityId,
    string FacilityName,
    int SportId,
    string SportName,
    string Name,
    string TournamentType,
    DateTime RegistrationDeadline,
    DateOnly StartDate,
    DateOnly EndDate,
    int MaxTeams,
    int RegisteredTeamsCount,
    decimal EntryFee,
    string? PrizeDescription,
    string Status,
    DateTime CreatedAt
);
