namespace SportHub.Application.Interfaces.Services;

public interface ICourtStatusNotifier
{
    Task NotifySlotUpdatedAsync(
        int facilityId,
        int courtId,
        DateOnly date,
        int timeSlotId,
        string status);
}
