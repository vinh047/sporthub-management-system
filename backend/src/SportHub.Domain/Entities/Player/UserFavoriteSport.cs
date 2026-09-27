using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Player;

public class UserFavoriteSport
{
    public int UserId { get; set; }
    public int SportId { get; set; }
    public SkillLevel SelfAssessmentRank { get; set; } = SkillLevel.Beginner;

    public Auth.User User { get; set; } = null!;
    public Facility.Sport Sport { get; set; } = null!;
}
