using SportHub.Domain.Entities.Player;

namespace SportHub.Application.Interfaces.Repositories;

public interface IPlayerProfileRepository : IRepository<PlayerProfile>
{
    Task<PlayerProfile?> GetByUserIdAsync(int userId);
}