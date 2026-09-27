using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class PricePolicy : BaseEntity
{
    public int FacilityId { get; set; }
    public int SportId { get; set; }
    public decimal BasePrice { get; set; }
    public decimal WeekendSurchargePercent { get; set; } = 0;
    public DateOnly EffectiveFrom { get; set; }
    public bool IsActive { get; set; } = true;

    public Facility Facility { get; set; } = null!;
    public Sport Sport { get; set; } = null!;
    public ICollection<PriceRuleDetail> PriceRuleDetails { get; set; } = [];
}
