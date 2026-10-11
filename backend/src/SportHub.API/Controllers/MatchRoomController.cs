using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.MatchRoom;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/matchrooms")]
public class MatchRoomController(IMatchRoomService matchRoomService) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BaseResponse<PagedResult<MatchRoomSummary>>>> Search(
        [FromQuery] SearchRoomsRequest request)
    {
        var result = await matchRoomService.SearchRoomsAsync(request);
        return Ok(BaseResponse<PagedResult<MatchRoomSummary>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<MatchRoomDetailResponse>>> GetDetail(int id)
    {
        var result = await matchRoomService.GetRoomDetailAsync(id);
        return Ok(BaseResponse<MatchRoomDetailResponse>.Ok(result));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<BaseResponse<MatchRoomResponse>>> Create([FromBody] CreateRoomRequest request)
    {
        var result = await matchRoomService.CreateRoomAsync(request, RequiredUserId);
        return StatusCode(201, BaseResponse<MatchRoomResponse>.Ok(result));
    }

    [HttpPost("{id}/join")]
    [Authorize]
    public async Task<ActionResult<BaseResponse>> Join(int id)
    {
        await matchRoomService.JoinRoomAsync(id, RequiredUserId);
        return Ok(BaseResponse.Ok("Tham gia phòng thành công!"));
    }

    [HttpPost("{id}/leave")]
    [Authorize]
    public async Task<ActionResult<BaseResponse>> Leave(int id, [FromBody] LeaveRoomRequest request)
    {
        await matchRoomService.LeaveRoomAsync(id, RequiredUserId, request.Reason);
        return Ok(BaseResponse.Ok("Đã rút khỏi phòng."));
    }

    [HttpPost("{id}/close")]
    [Authorize]
    public async Task<ActionResult<BaseResponse>> Close(int id)
    {
        await matchRoomService.CloseRoomAsync(id, RequiredUserId);
        return Ok(BaseResponse.Ok("Phòng đã được đóng."));
    }
}
