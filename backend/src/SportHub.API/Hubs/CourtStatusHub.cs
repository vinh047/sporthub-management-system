using Microsoft.AspNetCore.SignalR;

namespace SportHub.API.Hubs;

/// <summary>
/// Hub broadcast trạng thái sân theo thời gian thực (Public).
/// Frontend: joinGroup("facility-{facilityId}") để nhận update real-time.
/// </summary>
public class CourtStatusHub : Hub
{
    /// <summary>Join group để nhận update của 1 cơ sở cụ thể</summary>
    public async Task JoinFacilityGroup(int facilityId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"facility-{facilityId}");
    }

    /// <summary>Rời group của cơ sở</summary>
    public async Task LeaveFacilityGroup(int facilityId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"facility-{facilityId}");
    }
}
