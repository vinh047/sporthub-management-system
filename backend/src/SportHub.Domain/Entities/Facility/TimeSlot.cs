using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class TimeSlot : BaseEntity
{
    public int SlotIndex { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsDefaultPeak { get; set; } = false;

    public ICollection<PriceRuleDetail> PriceRuleDetails { get; set; } = [];
    public ICollection<Booking.BookingDetail> BookingDetails { get; set; } = [];
}
