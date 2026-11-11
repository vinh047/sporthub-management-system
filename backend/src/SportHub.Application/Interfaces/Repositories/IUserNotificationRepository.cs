using SportHub.Domain.Entities.Notifications;

namespace SportHub.Application.Interfaces.Repositories;

public interface IUserNotificationRepository : IRepository<UserNotification>
{
    Task<IEnumerable<UserNotification>> GetByUserIdAsync(int userId);

    Task<UserNotification?> GetByIdForUserAsync(int notificationId, int userId);
}