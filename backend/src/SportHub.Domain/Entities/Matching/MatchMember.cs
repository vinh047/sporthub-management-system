using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Matching;

public class MatchMember : BaseEntity
{
    public int RoomId { get; set; }
    public int UserId { get; set; }
    public MemberStatus MemberStatus { get; set; } = MemberStatus.Joined;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public MatchRoom Room { get; set; } = null!;
    public Auth.User User { get; set; } = null!;
    public MatchMemberLeaveLog? LeaveLog { get; set; }
}
