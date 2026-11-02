using SportHub.Domain.Entities.Auth;

namespace SportHub.Application.Interfaces.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByPhoneNumberAsync(string phoneNumber);
    Task<User?> GetWithProfileAsync(int userId);
    Task<User?> GetForLoginAsync(string phoneNumber);
    Task<Role?> GetRoleByCodeAsync(string roleCode);
}
