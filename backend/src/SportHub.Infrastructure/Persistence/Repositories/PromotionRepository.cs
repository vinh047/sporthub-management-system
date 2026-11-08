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

    public async Task<IEnumerable<UserVoucher>> GetUserVouchersAsync(int userId)
        => await _context.UserVouchers.Include(v => v.Promotion)
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

    public Task<UserVoucher?> GetUserVoucherAsync(int voucherId, int userId)
        => _context.UserVouchers.Include(v => v.Promotion)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.UserId == userId);

    public Task<int> CountUsedAsync(int promotionId)
        => _context.UserVouchers.CountAsync(v => v.PromotionId == promotionId && v.IsUsed);

    public Task<int> CountUsedByUserAsync(int promotionId, int userId)
        => _context.UserVouchers.CountAsync(v =>
            v.PromotionId == promotionId && v.UserId == userId && v.IsUsed);

    public Task AddVoucherAsync(UserVoucher voucher)
        => _context.UserVouchers.AddAsync(voucher).AsTask();
}
