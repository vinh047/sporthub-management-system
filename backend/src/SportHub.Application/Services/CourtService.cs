using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class CourtService(IUnitOfWork uow) : ICourtService
{
    public async Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request)
    {
        var facility = await uow.Facilities.GetByIdAsync(request.FacilityId)
            ?? throw new NotFoundException("Cơ sở", request.FacilityId);
        if (!Enum.TryParse<CourtType>(request.CourtType, true, out var courtType))
            throw new ValidationException(["Loại sân chỉ được là Indoor hoặc Outdoor."]);
        var court = new Court
        {
            FacilityId = facility.Id, SportId = request.SportId,
            CourtName = request.CourtName.Trim(), CourtType = courtType
        };
        await uow.Courts.AddAsync(court);
        await uow.SaveChangesAsync();
        var hydrated = await uow.Courts.GetWithRelationsAsync(court.Id) ?? court;
        return new(hydrated.Id, hydrated.FacilityId, hydrated.SportId,
            hydrated.Sport?.SportName ?? string.Empty, hydrated.CourtName,
            hydrated.CourtType.ToString(), hydrated.IsActive);
    }

    public async Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(
        int facilityId, int sportId, DateOnly date)
    {
        var courts = await uow.Courts.GetAvailableCourtsAsync(facilityId, sportId, date);
        var slots = await uow.Facilities.GetTimeSlotsAsync();
        var result = new List<CourtAvailabilityResponse>();
        foreach (var court in courts)
        {
            var policy = await uow.Facilities.GetPricePolicyAsync(facilityId, sportId, date);
            var rules = policy?.PriceRuleDetails.ToDictionary(r => r.TimeSlotId);
            var values = new List<SlotAvailability>();
            foreach (var slot in slots)
            {
                var rule = rules?.GetValueOrDefault(slot.Id);
                var price = rule?.HourlyRate ?? policy?.BasePrice ?? 0;
                if (policy is not null && date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                    price *= 1 + policy.WeekendSurchargePercent / 100;
                var available = await uow.Bookings.IsSlotAvailableAsync(court.Id, date, slot.Id);
                values.Add(new SlotAvailability(slot.Id, slot.StartTime, slot.EndTime,
                    available, rule?.IsPeakHour ?? slot.IsDefaultPeak, price));
            }
            result.Add(new(court.Id, court.CourtName, values));
        }
        return result;
    }

    public async Task LockCourtForMaintenanceAsync(LockCourtRequest request, int createdByUserId)
    {
        if (request.StartTime >= request.EndTime)
            throw new ValidationException(["Thời gian bảo trì không hợp lệ."]);
        var court = await uow.Courts.GetByIdAsync(request.CourtId)
            ?? throw new NotFoundException("Sân", request.CourtId);
        if (await uow.Facilities.HasMaintenanceOverlapAsync(
                court.Id, request.MaintenanceDate, request.StartTime, request.EndTime))
            throw new ConflictException("Khoảng thời gian bảo trì bị trùng.");
        await uow.Facilities.AddMaintenanceAsync(new CourtMaintenance
        {
            CourtId = court.Id, MaintenanceDate = request.MaintenanceDate,
            StartTime = request.StartTime, EndTime = request.EndTime,
            Reason = request.Reason.Trim(), CreatedByUserId = createdByUserId
        });
        await uow.SaveChangesAsync();
    }
}
