using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Matching;

public class MatchRoom : BaseEntity
{
    public int BookingDetailId { get; set; }    // Gắn với 1 BookingDetail cụ thể
    public int HostUserId { get; set; }
    public int SlotsNeeded { get; set; }
    public SkillLevel TargetSkillLevel { get; set; }
    public int MinReputationRequired { get; set; } = 60;
    public decimal? ShareFeeEstimate { get; set; }
    public DateTime JoinDeadline { get; set; }
    public string? Description { get; set; }
    public RoomStatus RoomStatus { get; set; } = RoomStatus.Open;

    public Booking.BookingDetail BookingDetail { get; set; } = null!;
    public Auth.User Host { get; set; } = null!;
    public ICollection<MatchMember> Members { get; set; } = [];
}
