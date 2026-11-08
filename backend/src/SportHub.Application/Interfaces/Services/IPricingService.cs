using SportHub.Application.DTOs.Facility;

namespace SportHub.Application.Interfaces.Services;

public interface IPricingService
{
    Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request);
}
