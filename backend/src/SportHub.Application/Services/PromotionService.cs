using SportHub.Application.DTOs.Promotion;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PromotionService(IUnitOfWork uow) : IPromotionService
{
    public async Task<PromotionResponse> CreateAsync(CreatePromotionRequest request)
    {
        if (request.StartDate >= request.EndDate || request.DiscountValue <= 0 ||
            request.MinOrderAmount < 0 || request.UsageLimitPerUser < 1)
            throw new ValidationException(["Thông tin chương trình khuyến mãi không hợp lệ."]);
        if (!request.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) &&
            !request.DiscountType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException(["DiscountType chỉ được là Percentage hoặc FixedAmount."]);
        if (request.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) &&
            request.DiscountValue > 100)
            throw new ValidationException(["Phần trăm giảm không được vượt quá 100."]);

        var promotion = new Promotion
        {
            PromoCode = request.PromoCode.Trim().ToUpperInvariant(),
            Title = request.Title.Trim(), DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue, MaxDiscountAmount = request.MaxDiscountAmount,
            MinOrderAmount = request.MinOrderAmount, UsageLimitTotal = request.UsageLimitTotal,
            UsageLimitPerUser = request.UsageLimitPerUser, StartDate = request.StartDate,
            EndDate = request.EndDate, IsOffPeakOnly = request.IsOffPeakOnly
        };
        await uow.Promotions.AddAsync(promotion);
        await uow.SaveChangesAsync();
        return ToResponse(promotion);
    }

    public async Task<IEnumerable<PromotionResponse>> GetActiveAsync()
        => (await uow.Promotions.GetAllAsync())
            .Where(p => p.IsActive && p.StartDate <= DateTime.UtcNow && p.EndDate >= DateTime.UtcNow)
            .Select(ToResponse);

    public async Task<PromotionDiscountResponse> ValidateAsync(
        ValidatePromotionRequest request, int userId)
    {
        var promotion = await uow.Promotions.FindActiveAsync(
            request.PromoCode.Trim().ToUpperInvariant(), DateTime.UtcNow)
            ?? throw new NotFoundException("Mã khuyến mãi", request.PromoCode);
        if (request.OrderAmount < promotion.MinOrderAmount)
            throw new ValidationException(["Đơn hàng chưa đạt giá trị tối thiểu."]);
        if (promotion.IsOffPeakOnly && !request.IsOffPeak)
            throw new ValidationException(["Mã chỉ áp dụng cho giờ thấp điểm."]);
        if (await uow.Promotions.CountUsedByUserAsync(promotion.Id, userId) >= promotion.UsageLimitPerUser)
            throw new ConflictException("Bạn đã sử dụng hết lượt của mã khuyến mãi này.");

        var discount = promotion.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
            ? request.OrderAmount * promotion.DiscountValue / 100
            : promotion.DiscountValue;
        if (promotion.MaxDiscountAmount.HasValue)
            discount = Math.Min(discount, promotion.MaxDiscountAmount.Value);
        discount = Math.Min(discount, request.OrderAmount);
        return new(promotion.PromoCode, discount, request.OrderAmount - discount);
    }

    private static PromotionResponse ToResponse(Promotion p)
        => new(p.Id, p.PromoCode, p.Title, p.DiscountType, p.DiscountValue,
            p.MaxDiscountAmount, p.MinOrderAmount, p.StartDate, p.EndDate,
            p.IsOffPeakOnly, p.IsActive);
}
