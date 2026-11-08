using Microsoft.AspNetCore.SignalR;
using System.Globalization;

namespace SportHub.API.Hubs;

/// <summary>
/// Hub broadcast trạng thái sân theo thời gian thực (Public).
/// Frontend: joinGroup("facility-{facilityId}") để nhận update real-time.
/// </summary>
public class CourtStatusHub : Hub
{
    /// <summary>Join group để nhận update của 1 cơ sở cụ thể</summary>
    public async Task JoinFacilityGroup(int facilityId, string? date = null)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(facilityId, date));
    }

    /// <summary>Rời group của cơ sở</summary>
    public async Task LeaveFacilityGroup(int facilityId, string? date = null)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(facilityId, date));
    }

    private static string GetGroupName(int facilityId, string? date)
    {
        if (date is null) return $"facility-{facilityId}";
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            throw new HubException("Ngày không hợp lệ. Hãy dùng định dạng yyyy-MM-dd.");
        return $"facility-{facilityId}-{date}";
    }
}
