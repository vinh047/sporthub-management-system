using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class NotificationService(IUnitOfWork uow) : INotificationService
{
    public Task SendToUserAsync(int userId, string templateCode, Dictionary<string, string> placeholders) => throw new NotImplementedException();
    public Task BroadcastCourtStatusAsync(int courtId, string status) => throw new NotImplementedException();
}
