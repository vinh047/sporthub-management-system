using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Booking;

public class CheckInLog : BaseEntity
{
    public int BookingDetailId { get; set; }
    public int? ParticipantUserId { get; set; }     // null nếu là Guest
    public int StaffUserId { get; set; }
    public DateTime CheckInAt { get; set; } = DateTime.UtcNow;
    public CheckInChannel CheckInChannel { get; set; }

    public BookingDetail BookingDetail { get; set; } = null!;
    public Auth.User? ParticipantUser { get; set; }
    public Auth.User StaffUser { get; set; } = null!;
}
