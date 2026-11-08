using SportHub.Application.Common;
using SportHub.Application.DTOs.MatchRoom;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class MatchRoomService(IUnitOfWork uow, IReputationService reputation, INotificationService notification) : IMatchRoomService
{
    public Task<MatchRoomResponse> CreateRoomAsync(CreateRoomRequest request, int hostUserId) => throw new NotImplementedException();
    public Task<PagedResult<MatchRoomSummary>> SearchRoomsAsync(SearchRoomsRequest request) => throw new NotImplementedException();
    public Task<MatchRoomDetailResponse> GetRoomDetailAsync(int roomId) => throw new NotImplementedException();
    public Task JoinRoomAsync(int roomId, int userId) => throw new NotImplementedException();
    public Task LeaveRoomAsync(int roomId, int userId, string? reason) => throw new NotImplementedException();
    public Task CloseRoomAsync(int roomId, int hostUserId) => throw new NotImplementedException();
}
