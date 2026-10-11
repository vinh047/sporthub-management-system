namespace SportHub.Application.Interfaces.Services;

public interface IReputationService
{
    Task AddDeltaAsync(int userId, int delta, string reason, int? relatedBookingId = null);
    Task<int> GetScoreAsync(int userId);
}
