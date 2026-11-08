using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Player;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
[Authorize]
public class PlayerProfilesController(
    IPlayerProfileService playerProfileService) : ApiControllerBase
{
    // Người chơi xem hồ sơ của chính mình
    [HttpGet("me")]
    public async Task<ActionResult<BaseResponse<PlayerProfileResponse>>> GetMyProfile()
    {
        var userId = GetCurrentUserId();

        var result = await playerProfileService.GetByUserIdAsync(userId);

        return Ok(BaseResponse<PlayerProfileResponse>.Ok(result));
    }

    // Người chơi cập nhật hồ sơ của chính mình
    [HttpPut("me")]
    public async Task<ActionResult<BaseResponse<PlayerProfileResponse>>> UpdateMyProfile(
        [FromBody] UpdatePlayerProfileRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await playerProfileService.UpdateAsync(userId, request);

        return Ok(BaseResponse<PlayerProfileResponse>.Ok(
            result,
            "Cập nhật hồ sơ người chơi thành công!"
        ));
    }

    // Admin xem hồ sơ của một người chơi bất kỳ
    [HttpGet("{userId:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<PlayerProfileResponse>>> GetByUserId(
        int userId)
    {
        var result = await playerProfileService.GetByUserIdAsync(userId);

        return Ok(BaseResponse<PlayerProfileResponse>.Ok(result));
    }

    // Lấy UserId từ JWT Token
    private int GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userId, out var parsedUserId))
        {
            throw new UnauthorizedAccessException(
                "Không xác định được tài khoản đăng nhập."
            );
        }

        return parsedUserId;
    }
}