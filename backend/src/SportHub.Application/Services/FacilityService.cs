using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class FacilityService(IUnitOfWork uow) : IFacilityService
{
    public async Task<FacilityResponse> CreateFacilityAsync(CreateFacilityRequest request)
    {
        ValidateHours(request.OpenTime, request.CloseTime);
        var facility = new Facility
        {
            Name = request.Name.Trim(), Address = request.Address.Trim(), Hotline = request.Hotline.Trim(),
            OpenTime = request.OpenTime, CloseTime = request.CloseTime
        };
        await uow.Facilities.AddAsync(facility);
        await uow.SaveChangesAsync();
        return ToResponse(facility);
    }

    public async Task<FacilityResponse> UpdateFacilityAsync(int id, UpdateFacilityRequest request)
    {
        var facility = await uow.Facilities.GetByIdAsync(id) ?? throw new NotFoundException("Cơ sở", id);
        var open = request.OpenTime ?? facility.OpenTime;
        var close = request.CloseTime ?? facility.CloseTime;
        ValidateHours(open, close);
        if (request.Name is not null) facility.Name = request.Name.Trim();
        if (request.Address is not null) facility.Address = request.Address.Trim();
        if (request.Hotline is not null) facility.Hotline = request.Hotline.Trim();
        facility.OpenTime = open; facility.CloseTime = close;
        if (request.IsActive.HasValue) facility.IsActive = request.IsActive.Value;
        await uow.SaveChangesAsync();
        return ToResponse(facility);
    }

    public async Task<IEnumerable<FacilityResponse>> GetAllFacilitiesAsync(bool activeOnly = true)
        => (await uow.Facilities.GetFacilitiesAsync(activeOnly)).Select(ToResponse);

    public async Task<FacilityDetailResponse> GetFacilityDetailAsync(int id)
    {
        var facility = await uow.Facilities.GetWithCourtsAsync(id)
            ?? throw new NotFoundException("Cơ sở", id);
        return new(facility.Id, facility.Name, facility.Address, facility.Hotline,
            facility.OpenTime, facility.CloseTime, facility.IsActive,
            facility.Courts.Select(c => new CourtSummary(c.Id, c.CourtName, c.Sport.SportName, c.IsActive)).ToList());
    }

    public async Task SetFacilityActiveAsync(int id, bool isActive)
    {
        var facility = await uow.Facilities.GetByIdAsync(id) ?? throw new NotFoundException("Cơ sở", id);
        facility.IsActive = isActive;
        await uow.SaveChangesAsync();
    }

    private static FacilityResponse ToResponse(Facility f)
        => new(f.Id, f.Name, f.Address, f.Hotline, f.OpenTime, f.CloseTime, f.IsActive);

    private static void ValidateHours(TimeOnly open, TimeOnly close)
    {
        if (open >= close) throw new ValidationException(["Giờ mở cửa phải trước giờ đóng cửa."]);
    }
}
