using SportHub.Domain.Entities.Loyalty;

namespace SportHub.Application.Interfaces.Repositories;

public interface IPromotionRepository : IRepository<Promotion>
{
    Task<Promotion?> FindActiveAsync(string code, DateTime now);
    Task<IEnumerable<UserVoucher>> GetUserVouchersAsync(int userId);
    Task<UserVoucher?> GetUserVoucherAsync(int voucherId, int userId);
    Task<int> CountUsedAsync(int promotionId);
    Task<int> CountUsedByUserAsync(int promotionId, int userId);
    Task AddVoucherAsync(UserVoucher voucher);
}
