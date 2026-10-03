namespace SportHub.Domain.Entities.Loyalty;

public class UserVoucher
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PromotionId { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime? UsedAt { get; set; }
    /// <summary>BirthdayGift, WinBack, LoyaltyTierReward</summary>
    public string? AssignedReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Auth.User User { get; set; } = null!;
    public Promotion Promotion { get; set; } = null!;
}
