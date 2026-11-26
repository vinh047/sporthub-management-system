namespace SportHub.Application.DTOs.Tournament;

public record RecordTournamentSetRequest(int Team1Points, int Team2Points, long ExpectedVersion);
