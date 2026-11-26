using SportHub.Application.DTOs.Tournament;

namespace SportHub.Application.Interfaces.Services;

public interface ITournamentBracketService
{
    Task<TournamentBracketDto> GetAsync(int tournamentId);
    Task<TournamentBracketDto> GenerateAsync(int tournamentId, int userId, bool isAdmin);
    Task<TournamentBracketDto> RecordSetAsync(int tournamentId, int matchId, int setNumber,
        RecordTournamentSetRequest request, int userId, bool isAdmin);
}
