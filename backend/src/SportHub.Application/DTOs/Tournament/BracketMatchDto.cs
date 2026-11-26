namespace SportHub.Application.DTOs.Tournament;

public record BracketMatchDto(int Id, int RoundNumber, int MatchOrder,
    int? Team1Id, string? Team1Name, int? Team2Id, string? Team2Name,
    int? WinnerTeamId, string Status, string? ScoreSummary, int? NextMatchId,
    int? NextSlot, List<TournamentSetDto> Sets);
