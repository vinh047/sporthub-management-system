using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Booking;

public class BookingDetail : BaseEntity
{
    public int BookingId { get; set; }
    public int CourtId { get; set; }
    public DateOnly PlayDate { get; set; }
    public int TimeSlotId { get; set; }
    public decimal SlotPrice { get; set; }

    public Booking Booking { get; set; } = null!;
    public Facility.Court Court { get; set; } = null!;
    public Facility.TimeSlot TimeSlot { get; set; } = null!;
    public ICollection<CheckInLog> CheckInLogs { get; set; } = [];
    public Matching.MatchRoom? MatchRoom { get; set; }  // 1 booking detail có thể có 1 phòng ghép
}
