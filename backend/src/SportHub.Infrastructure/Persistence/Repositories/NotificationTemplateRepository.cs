using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Notifications;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class NotificationTemplateRepository(SportHubDbContext context)
    : Repository<NotificationTemplate>(context), INotificationTemplateRepository
{
    public async Task<NotificationTemplate?> GetByCodeAsync(string templateCode)
    {
        return await _dbSet.FirstOrDefaultAsync(x => x.TemplateCode == templateCode);
    }
}