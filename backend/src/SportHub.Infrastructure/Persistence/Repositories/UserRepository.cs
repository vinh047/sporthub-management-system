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
        => await _dbSet
            .Include(u => u.PlayerProfile)
            .Include(u => u.UserRole)
            .FirstOrDefaultAsync(u => u.Id == userId);
}
