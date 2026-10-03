using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class Sport : BaseEntity
{
    public string SportCode { get; set; } = string.Empty;  // BADMINTON, PICKLEBALL, FOOTBALL5
    public string SportName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<Court> Courts { get; set; } = [];
    public ICollection<PricePolicy> PricePolicies { get; set; } = [];
}
