using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ApiControllerBase
{
    /// <summary>Đăng ký tài khoản Player mới</summary>
    [HttpPost("register")]
    public async Task<ActionResult<BaseResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        var result = await authService.RegisterAsync(request);
        return StatusCode(201, BaseResponse<AuthResponse>.Ok(result, "Đăng ký thành công!"));
    }

    /// <summary>Đăng nhập (Player, Staff, Admin)</summary>
    [HttpPost("login")]
    public async Task<ActionResult<BaseResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        var result = await authService.LoginAsync(request);
        return Ok(BaseResponse<AuthResponse>.Ok(result));
    }

    /// <summary>Cập nhật hồ sơ thể thao (môn + trình độ)</summary>
    [HttpPut("sport-profile")]
    [Authorize]
    public async Task<ActionResult<BaseResponse>> UpdateSportProfile([FromBody] UpdateSportProfileRequest request)
    {
        await authService.UpdateSportProfileAsync(RequiredUserId, request);
        return Ok(BaseResponse.Ok("Cập nhật hồ sơ thành công!"));
    }
}
