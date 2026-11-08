namespace SportHub.Application.Interfaces.Repositories;

public interface IPricingRepository
{
    Task<decimal?> GetSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task<IReadOnlyDictionary<int, decimal>> GetSlotPricesAsync(int courtId, DateOnly playDate);
}
