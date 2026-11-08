using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Player;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PlayerProfileRepository(SportHubDbContext context)
    : Repository<PlayerProfile>(context), IPlayerProfileRepository
{
    public async Task<PlayerProfile?> GetByUserIdAsync(int userId)
    {
        return await _dbSet
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }
}