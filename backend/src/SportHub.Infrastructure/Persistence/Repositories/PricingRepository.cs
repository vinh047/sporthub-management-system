using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Infrastructure.Persistence;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PricingRepository(SportHubDbContext context) : IPricingRepository
{
    public async Task<decimal?> GetSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        var prices = await GetSlotPricesAsync(courtId, playDate);
        return prices.TryGetValue(timeSlotId, out var price) ? price : null;
    }

    public async Task<IReadOnlyDictionary<int, decimal>> GetSlotPricesAsync(int courtId, DateOnly playDate)
    {
        var court = await context.Courts
            .AsNoTracking()
            .Where(item => item.Id == courtId && item.IsActive)
            .Select(item => new { item.FacilityId, item.SportId })
            .FirstOrDefaultAsync();
        if (court is null) return new Dictionary<int, decimal>();

        var policy = await context.PricePolicies
            .AsNoTracking()
            .Include(item => item.PriceRuleDetails)
            .Where(item =>
                item.FacilityId == court.FacilityId &&
                item.SportId == court.SportId &&
                item.IsActive &&
                item.EffectiveFrom <= playDate)
            .OrderByDescending(item => item.EffectiveFrom)
            .ThenByDescending(item => item.Id)
            .FirstOrDefaultAsync();

        if (policy is null) return new Dictionary<int, decimal>();

        var isWeekend = playDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
        var weekendMultiplier = isWeekend ? 1m + policy.WeekendSurchargePercent / 100m : 1m;
        return policy.PriceRuleDetails.ToDictionary(
            rule => rule.TimeSlotId,
            rule => decimal.Round(rule.HourlyRate * weekendMultiplier, 2, MidpointRounding.AwayFromZero));
    }
}
