namespace SportHub.Application.Interfaces.Services;

public interface INotificationPublisher
{
    Task SendToUserAsync(int userId, string title, string content);

    Task BroadcastCourtStatusAsync(int courtId, string status);
}