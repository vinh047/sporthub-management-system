using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Loyalty;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PromotionRepository(SportHubDbContext context)
    : Repository<Promotion>(context), IPromotionRepository
{
    public Task<Promotion?> FindActiveAsync(string code, DateTime now)
        => _dbSet.FirstOrDefaultAsync(p => p.PromoCode == code && p.IsActive &&
            p.StartDate <= now && p.EndDate >= now);

    public Task<int> CountUsedByUserAsync(int promotionId, int userId)
        => _context.UserVouchers.CountAsync(v =>
            v.PromotionId == promotionId && v.UserId == userId && v.IsUsed);
}
