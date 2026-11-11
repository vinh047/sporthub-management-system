using SportHub.Domain.Entities.Notifications;

namespace SportHub.Application.Interfaces.Repositories;

public interface INotificationTemplateRepository : IRepository<NotificationTemplate>
{
    Task<NotificationTemplate?> GetByCodeAsync(string templateCode);
}