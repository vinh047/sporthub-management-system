using SportHub.Domain.Entities.Auth;

namespace SportHub.Domain.Entities.Player;

public class SkillRatingHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal OldRating { get; set; }
    public decimal NewRating { get; set; }
    public decimal Delta { get; set; }
    public string ChangeReason { get; set; } = string.Empty;
    public int? TournamentMatchId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Tournament.TournamentMatch? TournamentMatch { get; set; }
}
