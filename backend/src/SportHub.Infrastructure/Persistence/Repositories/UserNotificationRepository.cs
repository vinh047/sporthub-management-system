using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Notifications;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class UserNotificationRepository(SportHubDbContext context)
    : Repository<UserNotification>(context), IUserNotificationRepository
{
    public async Task<IEnumerable<UserNotification>> GetByUserIdAsync(int userId)
    {
        return await _dbSet
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<UserNotification?> GetByIdForUserAsync(
        int notificationId,
        int userId)
    {
        return await _dbSet.FirstOrDefaultAsync(
            x => x.Id == notificationId && x.UserId == userId);
    }
}