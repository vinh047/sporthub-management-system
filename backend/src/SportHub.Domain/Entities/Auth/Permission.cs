using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class Permission : BaseEntity
{
    public string Resource { get; set; } = string.Empty; // FACILITY, BOOKING, PRICING
    public string Action { get; set; } = string.Empty;   // CREATE, READ, UPDATE, DELETE
    public string Description { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = [];
}
