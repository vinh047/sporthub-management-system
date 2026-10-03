using SportHub.Domain.Entities.Auth;

namespace SportHub.Domain.Entities.Player;

public class PlayerProfile
{
    public int UserId { get; set; }
    public int ReputationScore { get; set; } = 100;

    /// <summary>Điểm Elo/DUPR do AI tính, thang 1.00 - 5.00</summary>
    public decimal NumericSkillRating { get; set; } = 2.00m;

    /// <summary>Beginner, Intermediate, Advanced, Pro</summary>
    public string SkillLevel { get; set; } = "Beginner";

    public int TotalMatchesPlayed { get; set; } = 0;
    public int TotalNoShows { get; set; } = 0;

    public int LoyaltyPoints { get; set; } = 0;

    /// <summary>Bronze, Silver, Gold, Platinum</summary>
    public string CurrentTier { get; set; } = "Bronze";

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<SkillRatingHistory> SkillRatingHistories { get; set; } = [];
    public ICollection<ReputationHistory> ReputationHistories { get; set; } = [];
}
