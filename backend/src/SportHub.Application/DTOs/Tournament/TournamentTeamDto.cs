namespace SportHub.Application.DTOs.Tournament;

public record TournamentTeamDto(
    int Id,
    int TournamentId,
    string TeamName,
    int? SeedNumber,
    string Status,
    DateTime RegistrationDate,
    List<TournamentAthleteDto> Athletes
);
