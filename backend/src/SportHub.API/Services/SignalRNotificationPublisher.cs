using Microsoft.AspNetCore.SignalR;
using SportHub.API.Hubs;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Services;

public class SignalRNotificationPublisher(
    IHubContext<NotificationHub> notificationHub,
    IHubContext<CourtStatusHub> courtStatusHub
) : INotificationPublisher
{
    public async Task SendToUserAsync(int userId, string title, string content)
    {
        await notificationHub.Clients
            .User(userId.ToString())
            .SendAsync("ReceiveNotification", new
            {
                title,
                content
            });
    }

    public async Task BroadcastCourtStatusAsync(int courtId, string status)
    {
        await courtStatusHub.Clients.All
            .SendAsync("CourtSlotUpdated", new
            {
                courtId,
                slotInfo = status
            });
    }
}