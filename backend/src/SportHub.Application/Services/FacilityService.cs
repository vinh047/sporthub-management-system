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

    public async Task<IEnumerable<SportResponse>> GetActiveSportsAsync()
        => (await uow.Facilities.GetActiveSportsAsync())
            .Select(ToSportResponse);

    public async Task<IEnumerable<SportResponse>> GetSportsAsync()
        => (await uow.Facilities.GetSportsAsync(activeOnly: false))
            .Select(ToSportResponse);

    public async Task<SportResponse> CreateSportAsync(SaveSportRequest request)
    {
        var (code, name) = ValidateSport(request);
        var existing = await uow.Facilities.GetSportsAsync(activeOnly: false);
        if (existing.Any(s => s.SportCode.Equals(code, StringComparison.OrdinalIgnoreCase)))
            throw new ConflictException($"Mã bộ môn '{code}' đã tồn tại.");

        var sport = new Sport { SportCode = code, SportName = name, IsActive = request.IsActive };
        await uow.Facilities.AddSportAsync(sport);
        await uow.SaveChangesAsync();
        return ToSportResponse(sport);
    }

    public async Task<SportResponse> UpdateSportAsync(int id, SaveSportRequest request)
    {
        var sport = await uow.Facilities.GetSportEntityByIdAsync(id)
            ?? throw new NotFoundException("Bộ môn", id);
        var (code, name) = ValidateSport(request);
        var existing = await uow.Facilities.GetSportsAsync(activeOnly: false);
        if (existing.Any(s => s.Id != id && s.SportCode.Equals(code, StringComparison.OrdinalIgnoreCase)))
            throw new ConflictException($"Mã bộ môn '{code}' đã tồn tại.");

        sport.SportCode = code;
        sport.SportName = name;
        sport.IsActive = request.IsActive;
        await uow.SaveChangesAsync();
        return ToSportResponse(sport);
    }

    public async Task DeleteSportAsync(int id)
    {
        var sport = await uow.Facilities.GetSportEntityByIdAsync(id)
            ?? throw new NotFoundException("Bộ môn", id);
        sport.IsActive = false;
        await uow.SaveChangesAsync();
    }

    private static FacilityResponse ToResponse(Facility f)
        => new(f.Id, f.Name, f.Address, f.Hotline, f.OpenTime, f.CloseTime, f.IsActive);

    private static SportResponse ToSportResponse(Sport sport)
        => new(sport.Id, sport.SportCode, sport.SportName, sport.IsActive);

    private static (string Code, string Name) ValidateSport(SaveSportRequest request)
    {
        var code = request.SportCode.Trim().ToUpperInvariant();
        var name = request.SportName.Trim();
        if (code.Length is < 2 or > 30 ||
            !code.All(character => char.IsAsciiLetterOrDigit(character) || character == '_'))
            throw new ValidationException(["Mã bộ môn chỉ gồm chữ không dấu, số hoặc dấu gạch dưới (2–30 ký tự)."]);
        if (name.Length is < 2 or > 80)
            throw new ValidationException(["Tên bộ môn phải từ 2 đến 80 ký tự."]);
        return (code, name);
    }

    private static void ValidateHours(TimeOnly open, TimeOnly close)
    {
        if (open >= close) throw new ValidationException(["Giờ mở cửa phải trước giờ đóng cửa."]);
    }
}
