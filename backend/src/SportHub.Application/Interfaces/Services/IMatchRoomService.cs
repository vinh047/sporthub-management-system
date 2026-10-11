using SportHub.Application.Common;
using SportHub.Application.DTOs.MatchRoom;

namespace SportHub.Application.Interfaces.Services;

public interface IMatchRoomService
{
    Task<MatchRoomResponse> CreateRoomAsync(CreateRoomRequest request, int hostUserId);
    Task<PagedResult<MatchRoomSummary>> SearchRoomsAsync(SearchRoomsRequest request);
    Task<MatchRoomDetailResponse> GetRoomDetailAsync(int roomId);
    Task JoinRoomAsync(int roomId, int userId);
    Task LeaveRoomAsync(int roomId, int userId, string? reason);
    Task CloseRoomAsync(int roomId, int hostUserId);
}
