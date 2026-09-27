using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SportHub.API.Hubs;

/// <summary>
/// Hub gửi thông báo cá nhân đến từng user (JWT-authenticated).
/// Frontend kết nối: new HubConnectionBuilder().withUrl("/hubs/notifications", { accessTokenFactory }).build()
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    /// <summary>Gọi từ server để push thông báo đến 1 user cụ thể</summary>
    public static async Task SendToUserAsync(
        IHubContext<NotificationHub> hub, string userId, string title, string content)
    {
        await hub.Clients.User(userId).SendAsync("ReceiveNotification", new { title, content });
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        await base.OnConnectedAsync();
        // TODO: Lưu ConnectionId vào UserDeviceTokens
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
        // TODO: Remove ConnectionId khỏi UserDeviceTokens
    }
}

/// <summary>
/// Hub broadcast trạng thái sân (public — không cần auth để xem lịch trống).
/// Frontend: joinGroup("facility-{facilityId}") để nhận update real-time.
/// </summary>
public class CourtStatusHub : Hub
{
    /// <summary>Join group để nhận update của 1 facility cụ thể</summary>
    public async Task JoinFacilityGroup(int facilityId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"facility-{facilityId}");
    }

    public async Task LeaveFacilityGroup(int facilityId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"facility-{facilityId}");
    }

    /// <summary>Server gọi để broadcast khi 1 slot thay đổi trạng thái</summary>
    public static async Task BroadcastSlotStatusAsync(
        IHubContext<CourtStatusHub> hub, int facilityId, int courtId, string slotInfo)
    {
        await hub.Clients.Group($"facility-{facilityId}")
            .SendAsync("CourtSlotUpdated", new { courtId, slotInfo });
    }
}
