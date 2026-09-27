using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Matching;

public class MatchMemberLeaveLog : BaseEntity
{
    public int MatchMemberId { get; set; }
    public DateTime LeftAt { get; set; } = DateTime.UtcNow;
    public decimal HoursBeforeMatch { get; set; }
    public bool IsPenalized { get; set; } = false;
    public string? Reason { get; set; }

    public MatchMember MatchMember { get; set; } = null!;
}
