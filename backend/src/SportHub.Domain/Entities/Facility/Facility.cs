using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class Facility : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Hotline { get; set; } = string.Empty;
    public TimeOnly OpenTime { get; set; } = new TimeOnly(6, 0);
    public TimeOnly CloseTime { get; set; } = new TimeOnly(23, 0);
    public bool IsActive { get; set; } = true;

    public ICollection<Court> Courts { get; set; } = [];
    public ICollection<PricePolicy> PricePolicies { get; set; } = [];
    public ICollection<Auth.StaffProfile> StaffProfiles { get; set; } = [];
}
