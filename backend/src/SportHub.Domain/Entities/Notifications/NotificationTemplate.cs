using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Notifications;

public class NotificationTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TitlePattern { get; set; } = string.Empty;
    public string BodyPattern { get; set; } = string.Empty;

    public ICollection<UserNotification> Notifications { get; set; } = [];
}
