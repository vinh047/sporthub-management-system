using System.Data;
using SportHub.Application.DTOs.Promotion;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PromotionService(IUnitOfWork uow) : IPromotionService
{
    public async Task<PromotionResponse> CreateAsync(CreatePromotionRequest request)
    {
        ValidatePromotionRequest(request);
        var promotion = new Promotion
        {
            PromoCode = request.PromoCode.Trim().ToUpperInvariant(),
            Title = request.Title.Trim(),
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            MaxDiscountAmount = request.MaxDiscountAmount,
            MinOrderAmount = request.MinOrderAmount,
            UsageLimitTotal = request.UsageLimitTotal,
            UsageLimitPerUser = request.UsageLimitPerUser,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsOffPeakOnly = request.IsOffPeakOnly
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
        if (request.OrderAmount <= 0)
            throw new ValidationException(["Giá trị đơn hàng phải lớn hơn 0."]);
        var promotion = await uow.Promotions.FindActiveAsync(
            request.PromoCode.Trim().ToUpperInvariant(), DateTime.UtcNow)
            ?? throw new NotFoundException("Mã khuyến mãi", request.PromoCode);
        await EnsureUsageAvailableAsync(promotion, userId);
        return CalculateDiscount(promotion, request.OrderAmount, request.IsOffPeak);
    }

    public async Task<IEnumerable<UserVoucherResponse>> GetWalletAsync(int userId)
        => (await uow.Promotions.GetUserVouchersAsync(userId)).Select(ToVoucherResponse);

    public async Task<UserVoucherResponse> ClaimAsync(int promotionId, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var now = DateTime.UtcNow;
            var promotion = await uow.Promotions.GetByIdAsync(promotionId)
                ?? throw new NotFoundException("Mã khuyến mãi", promotionId);
            EnsurePromotionIsActive(promotion, now);

            await EnsureUsageAvailableAsync(promotion, userId);

            var voucher = new UserVoucher
            {
                UserId = userId,
                PromotionId = promotion.Id,
                AssignedReason = "SelfClaim"
            };
            await uow.Promotions.AddVoucherAsync(voucher);
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            return ToVoucherResponse(voucher, promotion);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<PromotionDiscountResponse> RedeemAsync(
        RedeemVoucherRequest request, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var voucher = await uow.Promotions.GetUserVoucherAsync(request.UserVoucherId, userId)
                ?? throw new NotFoundException("Voucher", request.UserVoucherId);
            if (voucher.IsUsed)
                throw new ConflictException("Voucher này đã được sử dụng.");

            var booking = await uow.Bookings.GetForVoucherAsync(request.BookingId)
                ?? throw new NotFoundException("Đơn đặt sân", request.BookingId);
            if (booking.UserId != userId)
                throw new ForbiddenException("Đơn đặt sân không thuộc tài khoản của bạn.");
            if (booking.BookingStatus != BookingStatus.Held ||
                booking.HoldExpiresAt is null || booking.HoldExpiresAt <= DateTime.UtcNow)
                throw new ConflictException("Voucher chỉ áp dụng cho đơn đang được giữ chỗ và còn hạn.");
            if (booking.DiscountAmount > 0)
                throw new ConflictException("Đơn đặt sân đã được áp dụng ưu đãi.");

            var now = DateTime.UtcNow;
            EnsurePromotionIsActive(voucher.Promotion, now);
            await EnsureUsageAvailableAsync(voucher.Promotion, userId);
            var isOffPeak = booking.Details.Count > 0 && booking.Details.All(detail =>
                detail.TimeSlot.StartTime >= new TimeOnly(8, 0) &&
                detail.TimeSlot.EndTime <= new TimeOnly(16, 0));
            var discount = CalculateDiscount(voucher.Promotion, booking.TotalAmount, isOffPeak);

            booking.DiscountAmount = discount.DiscountAmount;
            booking.FinalAmount = discount.FinalAmount;
            voucher.IsUsed = true;
            voucher.UsedAt = now;
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            return discount;
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    private static PromotionDiscountResponse CalculateDiscount(
        Promotion promotion, decimal orderAmount, bool isOffPeak)
    {
        if (orderAmount < promotion.MinOrderAmount)
            throw new ValidationException(["Đơn hàng chưa đạt giá trị tối thiểu."]);
        if (promotion.IsOffPeakOnly && !isOffPeak)
            throw new ValidationException(["Mã chỉ áp dụng cho giờ thấp điểm (08:00–16:00)."]);

        var discount = promotion.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
            ? orderAmount * promotion.DiscountValue / 100
            : promotion.DiscountValue;
        if (promotion.MaxDiscountAmount.HasValue)
            discount = Math.Min(discount, promotion.MaxDiscountAmount.Value);
        discount = Math.Min(discount, orderAmount);
        discount = decimal.Round(discount, 2, MidpointRounding.AwayFromZero);
        return new(promotion.PromoCode, discount, orderAmount - discount);
    }

    private async Task EnsureUsageAvailableAsync(Promotion promotion, int userId)
    {
        var userUses = await uow.Promotions.CountUsedByUserAsync(promotion.Id, userId);
        if (userUses >= promotion.UsageLimitPerUser)
            throw new ConflictException("Bạn đã sử dụng hết lượt ưu đãi cho chương trình này.");

        if (promotion.UsageLimitTotal is int limit &&
            await uow.Promotions.CountUsedAsync(promotion.Id) >= limit)
            throw new ConflictException("Chương trình đã hết lượt sử dụng.");
    }

    private static void ValidatePromotionRequest(CreatePromotionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PromoCode) ||
            string.IsNullOrWhiteSpace(request.Title) ||
            request.StartDate >= request.EndDate ||
            request.DiscountValue <= 0 ||
            request.MinOrderAmount < 0 ||
            request.UsageLimitPerUser < 1 ||
            request.UsageLimitTotal is < 1 ||
            request.MaxDiscountAmount is < 0)
            throw new ValidationException(["Thông tin chương trình khuyến mãi không hợp lệ."]);
        if (!request.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) &&
            !request.DiscountType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException(["DiscountType chỉ được là Percentage hoặc FixedAmount."]);
        if (request.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) &&
            request.DiscountValue > 100)
            throw new ValidationException(["Phần trăm giảm không được vượt quá 100."]);
    }

    private static void EnsurePromotionIsActive(Promotion promotion, DateTime now)
    {
        if (!promotion.IsActive || promotion.StartDate > now || promotion.EndDate < now)
            throw new ConflictException("Chương trình khuyến mãi chưa bắt đầu hoặc đã hết hạn.");
    }

    private static PromotionResponse ToResponse(Promotion promotion)
        => new(promotion.Id, promotion.PromoCode, promotion.Title, promotion.DiscountType,
            promotion.DiscountValue, promotion.MaxDiscountAmount, promotion.MinOrderAmount,
            promotion.UsageLimitTotal, promotion.UsageLimitPerUser,
            promotion.StartDate, promotion.EndDate, promotion.IsOffPeakOnly, promotion.IsActive);

    private static UserVoucherResponse ToVoucherResponse(UserVoucher voucher)
        => ToVoucherResponse(voucher, voucher.Promotion);

    private static UserVoucherResponse ToVoucherResponse(UserVoucher voucher, Promotion promotion)
        => new(voucher.Id, promotion.Id, promotion.PromoCode, promotion.Title,
            promotion.DiscountType, promotion.DiscountValue, promotion.MaxDiscountAmount,
            promotion.MinOrderAmount, promotion.EndDate, voucher.IsUsed, voucher.UsedAt);
}
