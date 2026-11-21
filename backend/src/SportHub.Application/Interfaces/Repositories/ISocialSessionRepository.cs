using SportHub.Domain.Entities.Social;

namespace SportHub.Application.Interfaces.Repositories;

public interface ISocialSessionRepository : IRepository<SocialSession>
{
    Task<IEnumerable<SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date);
    Task<IEnumerable<SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill);
    Task<IEnumerable<SocialSession>> FilterAsync(int? sportId, int? facilityId, decimal? minSkill, decimal? maxSkill, DateOnly? date, bool publishedOnly = true);
    Task<SocialSession?> GetDetailAsync(int id);
    Task<bool> HasCourtConflictAsync(int[] courtIds, DateOnly date, TimeOnly start, TimeOnly end, int? excludeId = null);
    void RemoveCourt(SocialSessionCourt court);
}
