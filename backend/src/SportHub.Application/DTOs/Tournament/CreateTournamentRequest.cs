namespace SportHub.Application.DTOs.Tournament;

public record CreateTournamentRequest(
    int FacilityId,
    int SportId,
    string Name,
    string TournamentType,
    DateTime RegistrationDeadline,
    DateOnly StartDate,
    DateOnly EndDate,
    int MaxTeams,
    decimal EntryFee,
    string? PrizeDescription,
    string Status = "OpenReg"
);
