using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class PricingService(IUnitOfWork uow) : IPricingService
{
    public Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId) => throw new NotImplementedException();
    public Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request) => throw new NotImplementedException();
}
