
using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Auth;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class StaffProfileRepository(SportHubDbContext context)
    : Repository<StaffProfile>(context), IStaffProfileRepository
{
    public async Task<StaffProfile?> GetByUserIdAsync(int userId)
        => await _dbSet
            .Include(x => x.User)
            .Include(x => x.ManagedFacility)
            .FirstOrDefaultAsync(x => x.UserId == userId);

    public async Task<StaffProfile?> GetDetailAsync(int userId)
        => await GetByUserIdAsync(userId);

    public async Task<IEnumerable<StaffProfile>> GetAllDetailsAsync()
        => await _dbSet
            .Include(x => x.User)
            .Include(x => x.ManagedFacility)
            .AsNoTracking()
            .ToListAsync();
}
