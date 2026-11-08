using SportHub.Domain.Entities.Facility;

namespace SportHub.Application.Interfaces.Repositories;

public interface IFacilityRepository : IRepository<Facility>
{
    Task<IEnumerable<Facility>> GetFacilitiesAsync(bool activeOnly);
    Task<Facility?> GetWithCourtsAsync(int id);
    Task<PricePolicy?> GetPricePolicyAsync(int facilityId, int sportId, DateOnly playDate);
    Task<IEnumerable<TimeSlot>> GetTimeSlotsAsync();
    Task<IEnumerable<Sport>> GetActiveSportsAsync();
    Task<IEnumerable<Sport>> GetSportsAsync(bool activeOnly);
    Task<Sport?> GetSportByIdAsync(int id);
    Task<Sport?> GetSportEntityByIdAsync(int id);
    Task AddSportAsync(Sport sport);
    Task<PricePolicy?> GetPricePolicyByEffectiveDateAsync(int facilityId, int sportId, DateOnly effectiveFrom);
    Task<bool> HasMaintenanceOverlapAsync(int courtId, DateOnly date, TimeOnly start, TimeOnly end);
    Task AddMaintenanceAsync(CourtMaintenance maintenance);
    Task AddPricePolicyAsync(PricePolicy policy);
}
