namespace SportHub.Application.DTOs.Tournament;

public record RegisterTournamentTeamRequest(
    string TeamName,
    List<string>? MemberPhones = null,
    List<int>? MemberUserIds = null,
    List<string>? MemberNames = null
);
