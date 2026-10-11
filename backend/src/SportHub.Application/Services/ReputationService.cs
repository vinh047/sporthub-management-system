using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class ReputationService(IUnitOfWork uow) : IReputationService
{
    public Task AddDeltaAsync(int userId, int delta, string reason, int? relatedBookingId = null) => throw new NotImplementedException();
    public Task<int> GetScoreAsync(int userId) => throw new NotImplementedException();
}
