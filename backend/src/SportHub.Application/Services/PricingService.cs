using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PricingService(IUnitOfWork uow) : IPricingService
{
    public async Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        var court = await uow.Courts.GetWithRelationsAsync(courtId)
            ?? throw new NotFoundException("Sân", courtId);
        var slot = (await uow.Facilities.GetTimeSlotsAsync()).FirstOrDefault(s => s.Id == timeSlotId)
            ?? throw new NotFoundException("Khung giờ", timeSlotId);
        var policy = await uow.Facilities.GetPricePolicyAsync(court.FacilityId, court.SportId, playDate);
        var rule = policy?.PriceRuleDetails.FirstOrDefault(r => r.TimeSlotId == timeSlotId);
        var price = rule?.HourlyRate ?? policy?.BasePrice ?? 0;
        if (policy is not null && playDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            price *= 1 + policy.WeekendSurchargePercent / 100;
        return price;
    }

    public async Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request)
    {
        if (request.BasePrice < 0 || request.WeekendSurchargePercent < 0)
            throw new ValidationException(["Giá và phụ thu không được âm."]);
        _ = await uow.Facilities.GetByIdAsync(request.FacilityId)
            ?? throw new NotFoundException("Cơ sở", request.FacilityId);
        var policy = new PricePolicy
        {
            FacilityId = request.FacilityId, SportId = request.SportId,
            BasePrice = request.BasePrice, WeekendSurchargePercent = request.WeekendSurchargePercent,
            EffectiveFrom = request.EffectiveFrom,
            PriceRuleDetails = request.Rules.Select(r => new PriceRuleDetail
            {
                TimeSlotId = r.TimeSlotId, HourlyRate = r.HourlyRate, IsPeakHour = r.IsPeakHour
            }).ToList()
        };
        await uow.Facilities.AddPricePolicyAsync(policy);
        await uow.SaveChangesAsync();
    }
}
