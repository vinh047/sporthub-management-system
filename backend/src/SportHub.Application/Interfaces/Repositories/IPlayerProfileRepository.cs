
using SportHub.Domain.Entities.Player;

namespace SportHub.Application.Interfaces.Repositories;

public interface IPlayerProfileRepository : IRepository<PlayerProfile>
{
    Task<PlayerProfile?> GetByUserIdAsync(int userId);

    // Lấy danh sách hồ sơ kèm thông tin User
    Task<IEnumerable<PlayerProfile>> GetAllWithUserAsync();
}
