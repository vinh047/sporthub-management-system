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
        var created = await CreateCourtsAsync(new CreateCourtsRequest(
            request.FacilityId, request.SportId, request.CourtName.Trim(), 1, request.CourtType));
        return created.Single();
    }

    public async Task<IEnumerable<CourtResponse>> CreateCourtsAsync(CreateCourtsRequest request)
    {
        if (request.Count is < 1 or > 100)
            throw new ValidationException(["Số lượng sân phải từ 1 đến 100."]);
        if (string.IsNullOrWhiteSpace(request.NamePrefix))
            throw new ValidationException(["Tên tiền tố của sân không được để trống."]);
        var facility = await uow.Facilities.GetByIdAsync(request.FacilityId)
            ?? throw new NotFoundException("Cơ sở", request.FacilityId);
        if (!facility.IsActive)
            throw new ValidationException(["Không thể thêm sân vào cơ sở đã ngừng hoạt động."]);
        var sport = await uow.Facilities.GetSportByIdAsync(request.SportId)
            ?? throw new NotFoundException("Môn thể thao", request.SportId);
        if (!Enum.TryParse<CourtType>(request.CourtType, true, out var courtType))
            throw new ValidationException(["Loại sân chỉ được là Indoor hoặc Outdoor."]);

        var prefix = request.NamePrefix.Trim();
        string[] names = request.Count == 1
            ? [prefix]
            : Enumerable.Range(1, request.Count).Select(index => $"{prefix} {index:00}").ToArray();
        if (await uow.Courts.CourtNamesExistAsync(facility.Id, names))
            throw new ConflictException("Một hoặc nhiều tên sân đã tồn tại tại cơ sở này.");

        var courts = names.Select(name => new Court
        {
            FacilityId = facility.Id,
            SportId = sport.Id,
            CourtName = name,
            CourtType = courtType
        }).ToList();
        foreach (var court in courts)
            await uow.Courts.AddAsync(court);
        await uow.SaveChangesAsync();
        return courts.Select(c => new CourtResponse(
            c.Id, c.FacilityId, c.SportId, sport.SportName,
            c.CourtName, c.CourtType.ToString(), c.IsActive));
    }

    public async Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(
        int facilityId, int sportId, DateOnly date)
    {
        var courts = await uow.Courts.GetAvailableCourtsAsync(facilityId, sportId, date);
        var slots = await uow.Facilities.GetTimeSlotsAsync();
        var policy = await uow.Facilities.GetPricePolicyAsync(facilityId, sportId, date);
        var rules = policy?.PriceRuleDetails.ToDictionary(r => r.TimeSlotId);
        var result = new List<CourtAvailabilityResponse>();
        foreach (var court in courts)
        {
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
