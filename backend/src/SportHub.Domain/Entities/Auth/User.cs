using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Auth;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public UserRole? UserRole { get; set; }
    public StaffProfile? StaffProfile { get; set; }
    public Player.PlayerProfile? PlayerProfile { get; set; }
}
