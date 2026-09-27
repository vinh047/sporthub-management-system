using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class Role : BaseEntity
{
    public string RoleCode { get; set; } = string.Empty; // ADMIN, STAFF, PLAYER
    public string RoleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
}
