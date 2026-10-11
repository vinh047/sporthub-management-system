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
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        await base.OnConnectedAsync();
        // TODO: Lưu ConnectionId vào UserDeviceTokens nếu cần
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
        // TODO: Xóa ConnectionId khỏi UserDeviceTokens nếu cần
    }
}
