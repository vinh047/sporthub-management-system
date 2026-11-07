using SportHub.Application.DTOs.Promotion;

namespace SportHub.Application.Interfaces.Services;

public interface IPromotionService
{
    Task<PromotionResponse> CreateAsync(CreatePromotionRequest request);
    Task<IEnumerable<PromotionResponse>> GetActiveAsync();
    Task<PromotionDiscountResponse> ValidateAsync(ValidatePromotionRequest request, int userId);
    Task<IEnumerable<UserVoucherResponse>> GetWalletAsync(int userId);
    Task<UserVoucherResponse> ClaimAsync(int promotionId, int userId);
    Task<PromotionDiscountResponse> RedeemAsync(RedeemVoucherRequest request, int userId);
}
