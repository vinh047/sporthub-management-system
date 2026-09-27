using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Notifications;

public class UserNotification : BaseEntity
{
    public int UserId { get; set; }
    public int TemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;

    public Auth.User User { get; set; } = null!;
    public NotificationTemplate Template { get; set; } = null!;
}
