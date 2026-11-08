using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class CourtService(IUnitOfWork uow, IPricingService pricing) : ICourtService
{
    public Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request) => throw new NotImplementedException();

    public async Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(int facilityId, int sportId, DateOnly date)
    {
        var courts = await uow.Courts.GetAvailableCourtsAsync(facilityId, sportId, date);
        var courtList = courts.ToList();
        if (courtList.Count == 0)
        {
            return [];
        }

        var result = new List<CourtAvailabilityResponse>();

        foreach (var court in courtList)
        {
            var prices = await pricing.GetSlotPricesAsync(court.Id, date);
            var slots = new List<SlotAvailability>();
            for (int slotId = 1; slotId <= 17; slotId++)
            {
                if (!prices.TryGetValue(slotId, out var price))
                    throw new InvalidOperationException($"Missing price for court {court.Id}, date {date}, slot {slotId}.");

                var startHour = 5 + slotId;
                var status = await uow.Bookings.GetSlotStatusAsync(court.Id, date, slotId);
                var isAvailable = status == "Available";

                slots.Add(new SlotAvailability(
                    slotId,
                    new TimeOnly(startHour, 0),
                    new TimeOnly(startHour + 1, 0),
                    isAvailable,
                    startHour >= 17 && startHour < 21,
                    price,
                    status
                ));
            }

            result.Add(new CourtAvailabilityResponse(
                court.Id,
                court.CourtName,
                slots
            ));
        }

        return result;
    }

    public Task LockCourtForMaintenanceAsync(LockCourtRequest request) => throw new NotImplementedException();
}
