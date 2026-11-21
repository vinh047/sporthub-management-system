using SportHub.Application.DTOs.Player;

namespace SportHub.Application.Interfaces.Services;

public interface IPlayerRatingService
{
    Task<PlayerRatingDashboardDto> GetMyDashboardAsync(int userId, CancellationToken ct = default);
    /// <summary>Admin-only trigger after the tournament match result has been marked Completed by its owner.</summary>
    Task<MatchRatingResultDto> ApplyTournamentMatchAsync(int matchId, CancellationToken ct = default);
}
