using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class PriceRuleDetail : BaseEntity
{
    public int PolicyId { get; set; }
    public int TimeSlotId { get; set; }
    public decimal HourlyRate { get; set; }
    public bool IsPeakHour { get; set; }

    public PricePolicy Policy { get; set; } = null!;
    public TimeSlot TimeSlot { get; set; } = null!;
}
