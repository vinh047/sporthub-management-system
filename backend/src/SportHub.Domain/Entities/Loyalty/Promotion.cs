namespace SportHub.Domain.Entities.Loyalty;

public class Promotion
{
    public int Id { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    /// <summary>Percentage, FixedAmount</summary>
    public string DiscountType { get; set; } = "Percentage";
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal MinOrderAmount { get; set; } = 0;
    public int? UsageLimitTotal { get; set; }
    public int UsageLimitPerUser { get; set; } = 1;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    /// <summary>Chỉ áp dụng khung giờ thấp điểm 8:00-16:00</summary>
    public bool IsOffPeakOnly { get; set; } = false;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<UserVoucher> UserVouchers { get; set; } = [];
}
