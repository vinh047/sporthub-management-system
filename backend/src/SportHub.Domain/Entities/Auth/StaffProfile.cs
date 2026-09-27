using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class StaffProfile : BaseEntity
{
    public int UserId { get; set; }
    public int? ManagedFacilityId { get; set; }
    public string Position { get; set; } = string.Empty;

    public User User { get; set; } = null!;
    public Facility.Facility? ManagedFacility { get; set; }
    public ICollection<StaffPermissionOverride> PermissionOverrides { get; set; } = [];
}
