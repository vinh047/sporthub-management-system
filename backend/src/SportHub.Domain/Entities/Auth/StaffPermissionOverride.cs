using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class StaffPermissionOverride : BaseEntity
{
    public int StaffProfileId { get; set; }
    public int PermissionId { get; set; }
    public bool IsGranted { get; set; } = true;
    public int AssignedByAdminId { get; set; }

    public StaffProfile StaffProfile { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
