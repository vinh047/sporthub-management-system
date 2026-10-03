namespace SportHub.Domain.Entities.Social;

public class SocialParticipant
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public int UserId { get; set; }
    /// <summary>Confirmed, CheckedIn, Cancelled, NoShow</summary>
    public string Status { get; set; } = "Confirmed";
    public decimal PaidAmount { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public SocialSession Session { get; set; } = null!;
    public Auth.User User { get; set; } = null!;
}
