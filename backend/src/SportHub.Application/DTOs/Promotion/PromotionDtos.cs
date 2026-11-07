namespace SportHub.Application.DTOs.Promotion;

public record CreatePromotionRequest(
    string PromoCode,
    string Title,
    string DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    int? UsageLimitTotal,
    int UsageLimitPerUser,
    DateTime StartDate,
    DateTime EndDate,
    bool IsOffPeakOnly);

public record PromotionResponse(
    int Id,
    string PromoCode,
    string Title,
    string DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    int? UsageLimitTotal,
    int UsageLimitPerUser,
    DateTime StartDate,
    DateTime EndDate,
    bool IsOffPeakOnly,
    bool IsActive);

public record ValidatePromotionRequest(string PromoCode, decimal OrderAmount, bool IsOffPeak);

public record PromotionDiscountResponse(
    string PromoCode,
    decimal DiscountAmount,
    decimal FinalAmount);
