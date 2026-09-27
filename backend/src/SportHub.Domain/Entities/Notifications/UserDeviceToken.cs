using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Notifications;

public class UserDeviceToken : BaseEntity
{
    public int UserId { get; set; }
    public string ConnectionId { get; set; } = string.Empty;    // SignalR ConnectionId
    public string ClientType { get; set; } = string.Empty;      // WEB, MOBILE
    public DateTime LastConnectedAt { get; set; } = DateTime.UtcNow;

    public Auth.User User { get; set; } = null!;
}
