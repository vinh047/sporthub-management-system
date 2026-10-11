using SportHub.Domain.Entities.Social;

namespace SportHub.Application.Interfaces.Repositories;

public interface ISocialSessionRepository : IRepository<SocialSession>
{
    Task<IEnumerable<SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date);
    Task<IEnumerable<SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill);
}
