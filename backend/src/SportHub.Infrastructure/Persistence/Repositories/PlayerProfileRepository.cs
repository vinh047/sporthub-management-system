
using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Player;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PlayerProfileRepository(SportHubDbContext context)
    : Repository<PlayerProfile>(context), IPlayerProfileRepository
{
    // Lấy hồ sơ người chơi theo UserId
    public async Task<PlayerProfile?> GetByUserIdAsync(int userId)
    {
        return await _dbSet
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }

    // Lấy tất cả hồ sơ người chơi kèm thông tin User
    public async Task<IEnumerable<PlayerProfile>> GetAllWithUserAsync()
    {
        return await _dbSet
            .Include(p => p.User)
            .OrderBy(p => p.User.FullName)
            .ToListAsync();
    }
}
