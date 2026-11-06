using SportHub.Domain.Entities.Loyalty;

namespace SportHub.Application.Interfaces.Repositories;

public interface IPromotionRepository : IRepository<Promotion>
{
    Task<Promotion?> FindActiveAsync(string code, DateTime now);
    Task<int> CountUsedByUserAsync(int promotionId, int userId);
}
