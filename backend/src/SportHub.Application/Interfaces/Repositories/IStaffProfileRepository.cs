
using SportHub.Domain.Entities.Auth;

namespace SportHub.Application.Interfaces.Repositories;

public interface IStaffProfileRepository : IRepository<StaffProfile>
{
    Task<StaffProfile?> GetByUserIdAsync(int userId);

    Task<StaffProfile?> GetDetailAsync(int userId);

    Task<IEnumerable<StaffProfile>> GetAllDetailsAsync();
}
