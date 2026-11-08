using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Auth;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class UserRepository(SportHubDbContext context)
    : Repository<User>(context), IUserRepository
{
    public async Task<User?> GetByPhoneNumberAsync(string phoneNumber)
        => await _dbSet.FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);

    public async Task<User?> GetWithProfileAsync(int userId)
        => await WithRoleAndProfiles().FirstOrDefaultAsync(u => u.Id == userId);

    public async Task<User?> GetForLoginAsync(string phoneNumber)
        => await WithRoleAndProfiles().FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);

    public async Task<Role?> GetRoleByCodeAsync(string roleCode)
        => await _context.Roles.FirstOrDefaultAsync(r => r.RoleCode == roleCode);

    private IQueryable<User> WithRoleAndProfiles() => _dbSet
        .Include(u => u.UserRole).ThenInclude(ur => ur!.Role)
        .Include(u => u.PlayerProfile)
        .Include(u => u.StaffProfile);
}
