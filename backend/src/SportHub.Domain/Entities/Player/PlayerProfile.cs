using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Player;

public class PlayerProfile
{
    public int UserId { get; set; }
    public int ReputationScore { get; set; } = 100;
    public SkillLevel SkillLevel { get; set; } = SkillLevel.Beginner;
    public int TotalMatchesPlayed { get; set; } = 0;
    public int TotalNoShows { get; set; } = 0;

    public Auth.User User { get; set; } = null!;
}
