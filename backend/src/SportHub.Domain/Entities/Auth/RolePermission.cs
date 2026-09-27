using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class RolePermission : BaseEntity
{
    public int RoleId { get; set; }
    public int PermissionId { get; set; }
    public bool IsGranted { get; set; } = true;

    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
