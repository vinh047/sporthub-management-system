using System.Globalization;
using Microsoft.AspNetCore.SignalR;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Hubs;

public class SignalRCourtStatusNotifier(
    IHubContext<CourtStatusHub> hubContext,
    ILogger<SignalRCourtStatusNotifier> logger) : ICourtStatusNotifier
{
    public async Task NotifySlotUpdatedAsync(
        int facilityId,
        int courtId,
        DateOnly date,
        int timeSlotId,
        string status)
    {
        var dateText = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var update = new
        {
            courtId,
            date = dateText,
            timeSlotId,
            status,
            slotInfo = status
        };

        try
        {
            await Task.WhenAll(
                hubContext.Clients
                    .Group($"facility-{facilityId}-{dateText}")
                    .SendAsync("CourtSlotUpdated", update),
                hubContext.Clients
                    .Group($"facility-{facilityId}")
                    .SendAsync("CourtSlotUpdated", update));
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Could not broadcast court {CourtId} slot {TimeSlotId} status {Status}.",
                courtId,
                timeSlotId,
                status);
        }
    }
}
