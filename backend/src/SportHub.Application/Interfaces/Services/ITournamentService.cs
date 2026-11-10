using SportHub.Application.DTOs.Tournament;

namespace SportHub.Application.Interfaces.Services;

public interface ITournamentService
{
    Task<List<TournamentDetailDto>> GetMyTournamentsAsync(int userId);
    Task<List<TournamentDto>> GetTournamentsAsync(int? facilityId, int? sportId, string? status);
    Task<TournamentDetailDto> GetTournamentByIdAsync(int id);
    Task<TournamentDto> CreateTournamentAsync(CreateTournamentRequest request, int staffUserId, bool isAdmin);
    Task<TournamentDto> UpdateTournamentStatusAsync(int id, string status, int staffUserId, bool isAdmin);
    Task<TournamentTeamDto> RegisterTeamAsync(int tournamentId, RegisterTournamentTeamRequest request, int currentUserId);
}
