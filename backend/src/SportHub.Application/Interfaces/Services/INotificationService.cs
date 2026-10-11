namespace SportHub.Application.Interfaces.Services;

public interface INotificationService
{
    Task SendToUserAsync(int userId, string templateCode, Dictionary<string, string> placeholders);
    Task BroadcastCourtStatusAsync(int courtId, string status);
}
