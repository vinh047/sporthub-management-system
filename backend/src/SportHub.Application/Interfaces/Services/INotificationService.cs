using SportHub.Application.DTOs.Notifications;

namespace SportHub.Application.Interfaces.Services;

public interface INotificationService
{
    Task SendToUserAsync(
        int userId,
        string templateCode,
        Dictionary<string, string> placeholders);

    Task BroadcastCourtStatusAsync(int courtId, string status);

    Task<IEnumerable<NotificationResponse>> GetMyNotificationsAsync(int userId);

    Task<bool> MarkAsReadAsync(int notificationId, int userId);
}