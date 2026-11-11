namespace SportHub.Application.DTOs.Tournament;

public record TournamentMatchDto(
    int Id,
    int RoundNumber,
    int MatchOrder,
    int? CourtId,
    string? CourtName,
    DateTime? ScheduledStartTime,
    int? Team1Id,
    string? Team1Name,
    int? Team2Id,
    string? Team2Name,
    int? WinnerTeamId,
    string? ScoreSummary,
    string Status
);
