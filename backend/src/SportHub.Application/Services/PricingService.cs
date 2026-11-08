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
        if (request.BasePrice < 0 || request.WeekendSurchargePercent < 0 ||
            request.WeekendSurchargePercent > 1000)
            throw new ValidationException(["Giá không được âm và phụ thu cuối tuần không được vượt quá 1000%."]);
        if (request.Rules is null || request.Rules.Any(r => r.HourlyRate < 0) ||
            request.Rules.Select(r => r.TimeSlotId).Distinct().Count() != request.Rules.Count)
            throw new ValidationException(["Danh sách giá theo khung giờ không hợp lệ hoặc có khung giờ trùng."]);
        _ = await uow.Facilities.GetByIdAsync(request.FacilityId)
            ?? throw new NotFoundException("Cơ sở", request.FacilityId);
        _ = await uow.Facilities.GetSportByIdAsync(request.SportId)
            ?? throw new NotFoundException("Môn thể thao", request.SportId);
        var slots = await uow.Facilities.GetTimeSlotsAsync();
        var slotIds = slots.Select(s => s.Id).ToHashSet();
        if (request.Rules.Any(rule => !slotIds.Contains(rule.TimeSlotId)))
            throw new ValidationException(["Danh sách chứa khung giờ không tồn tại."]);

        var policy = await uow.Facilities.GetPricePolicyByEffectiveDateAsync(
            request.FacilityId, request.SportId, request.EffectiveFrom);
        if (policy is null)
        {
            policy = new PricePolicy
            {
                FacilityId = request.FacilityId,
                SportId = request.SportId,
                EffectiveFrom = request.EffectiveFrom
            };
            await uow.Facilities.AddPricePolicyAsync(policy);
        }
        else
        {
            policy.PriceRuleDetails.Clear();
        }

        policy.BasePrice = request.BasePrice;
        policy.WeekendSurchargePercent = request.WeekendSurchargePercent;
        policy.IsActive = true;
        foreach (var rule in request.Rules)
            policy.PriceRuleDetails.Add(new PriceRuleDetail
            {
                TimeSlotId = rule.TimeSlotId,
                HourlyRate = rule.HourlyRate,
                IsPeakHour = rule.IsPeakHour
            });
        await uow.SaveChangesAsync();
    }
}
