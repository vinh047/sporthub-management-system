using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Social;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class SocialSessionRepository(SportHubDbContext context)
    : Repository<SocialSession>(context), ISocialSessionRepository
{
    public async Task<IEnumerable<SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date)
    {
        var query = _dbSet.Where(s => s.FacilityId == facilityId && s.Status == "Published");
        if (date.HasValue)
            query = query.Where(s => s.PlayDate == date.Value);
        return await query.Include(s => s.Sport).Include(s => s.Participants).ToListAsync();
    }

    public async Task<IEnumerable<SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill)
    {
        var query = _dbSet.Where(s => s.Status == "Published");
        if (sportId.HasValue) query = query.Where(s => s.SportId == sportId.Value);
        if (minSkill.HasValue) query = query.Where(s => s.MinSkill >= minSkill.Value);
        if (maxSkill.HasValue) query = query.Where(s => s.MaxSkill <= maxSkill.Value);
        return await query.Include(s => s.Participants).ToListAsync();
    }
}
