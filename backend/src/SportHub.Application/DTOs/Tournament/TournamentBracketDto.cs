namespace SportHub.Application.DTOs.Tournament;

public record TournamentBracketDto(int TournamentId, string Name, string TournamentType,
    string Status, long Version, int BestOf, int? ChampionTeamId, string? ChampionTeamName,
    List<BracketMatchDto> Matches);
