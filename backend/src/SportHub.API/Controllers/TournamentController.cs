using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/tournaments")]
public class TournamentController(ITournamentService tournamentService) : ApiControllerBase
{
    private bool IsAdmin => CurrentUserRole == "ADMIN";

    [HttpGet("mine")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<List<TournamentDetailDto>>>> GetMine()
        => Ok(BaseResponse<List<TournamentDetailDto>>.Ok(
            await tournamentService.GetMyTournamentsAsync(RequiredUserId)));

    /// <summary>Lấy danh sách giải đấu (hỗ trợ lọc theo cơ sở, môn thể thao, trạng thái)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<BaseResponse<List<TournamentDto>>>> GetAll(
        [FromQuery] int? facilityId = null,
        [FromQuery] int? sportId = null,
        [FromQuery] string? status = null)
        => Ok(BaseResponse<List<TournamentDto>>.Ok(
            await tournamentService.GetTournamentsAsync(facilityId, sportId, status)));

    /// <summary>Xem chi tiết giải đấu, điều lệ, danh sách đội và vận động viên đã đăng ký</summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<BaseResponse<TournamentDetailDto>>> GetById(int id)
        => Ok(BaseResponse<TournamentDetailDto>.Ok(
            await tournamentService.GetTournamentByIdAsync(id)));

    /// <summary>Khởi tạo giải đấu mới (Admin / Staff)</summary>
    [HttpPost]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse<TournamentDto>>> Create([FromBody] CreateTournamentRequest request)
    {
        var result = await tournamentService.CreateTournamentAsync(request, RequiredUserId, IsAdmin);
        return StatusCode(201, BaseResponse<TournamentDto>.Ok(result, "Khởi tạo giải đấu thành công!"));
    }

    /// <summary>Cập nhật trạng thái giải đấu (OpenReg, DrawCompleted, InProgress, Finished)</summary>
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse<TournamentDto>>> UpdateStatus(
        int id,
        [FromBody] UpdateTournamentStatusRequest request)
    {
        var result = await tournamentService.UpdateTournamentStatusAsync(id, request.Status, RequiredUserId, IsAdmin);
        return Ok(BaseResponse<TournamentDto>.Ok(result, "Cập nhật trạng thái giải đấu thành công!"));
    }

    /// <summary>Đăng ký đội và danh sách vận động viên tham gia giải đấu</summary>
    [HttpPost("{id:int}/teams")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<TournamentTeamDto>>> RegisterTeam(
        int id,
        [FromBody] RegisterTournamentTeamRequest request)
    {
        var result = await tournamentService.RegisterTeamAsync(id, request, RequiredUserId);
        return StatusCode(201, BaseResponse<TournamentTeamDto>.Ok(result, $"Đăng ký đội '{result.TeamName}' thành công!"));
    }
}
