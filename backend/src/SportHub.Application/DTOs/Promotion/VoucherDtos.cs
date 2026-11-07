namespace SportHub.Application.DTOs.Promotion;

public record UserVoucherResponse(
    int Id,
    int PromotionId,
    string PromoCode,
    string Title,
    string DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    DateTime ExpiresAt,
    bool IsUsed,
    DateTime? UsedAt);

public record RedeemVoucherRequest(int UserVoucherId, int BookingId);
