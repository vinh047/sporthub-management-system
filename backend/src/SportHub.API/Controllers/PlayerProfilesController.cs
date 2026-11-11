using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Player;
using SportHub.Application.Interfaces.Services;
using System.IO;
using System.Linq;

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

    // Upload ảnh đại diện
    [HttpPost("me/avatar")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAvatar(
    IFormFile file)
    {
        var userId = GetCurrentUserId();

        if (file == null || file.Length == 0)
        {
            return BadRequest(
                BaseResponse<PlayerProfileResponse>.Fail("Vui lòng chọn ảnh.")
            );
        }

        // Giới hạn 2 MB
        const long maxFileSize = 2 * 1024 * 1024;

        if (file.Length > maxFileSize)
        {
            return BadRequest(
                BaseResponse<PlayerProfileResponse>.Fail("Ảnh không được vượt quá 2 MB.")
            );
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(
                BaseResponse<PlayerProfileResponse>.Fail(
                    "Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP."
                )
            );
        }

        var allowedContentTypes = new[]
        {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

        if (!allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(
                BaseResponse<PlayerProfileResponse>.Fail("Định dạng ảnh không hợp lệ.")
            );
        }

        await using var stream = file.OpenReadStream();

        var result = await playerProfileService.UpdateAvatarAsync(
            userId,
            stream,
            extension
        );

        return Ok(
            BaseResponse<PlayerProfileResponse>.Ok(
                result,
                "Cập nhật ảnh đại diện thành công!"
            )
        );
    }

    // Xóa ảnh đại diện
    [HttpDelete("me/avatar")]
    public async Task<ActionResult<BaseResponse<PlayerProfileResponse>>> RemoveAvatar()
    {
        var userId = GetCurrentUserId();

        var result = await playerProfileService.RemoveAvatarAsync(userId);

        return Ok(
            BaseResponse<PlayerProfileResponse>.Ok(
                result,
                "Xóa ảnh đại diện thành công!"
            )
        );
    }

    // Admin lấy danh sách tất cả người chơi
    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<IEnumerable<PlayerProfileResponse>>>>
        GetAll()
    {
        var result = await playerProfileService.GetAllAsync();

        return Ok(BaseResponse<IEnumerable<PlayerProfileResponse>>.Ok(result));
    }

    // Admin khóa hoặc mở khóa tài khoản người chơi
    [HttpPut("{userId:int}/status")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<PlayerProfileResponse>>>
        UpdateStatus(
            int userId,
            [FromBody] UpdatePlayerStatusRequest request)
    {
        var result = await playerProfileService.UpdateStatusAsync(
            userId,
            request
        );

        var message = request.IsActive
            ? "Kích hoạt tài khoản người chơi thành công!"
            : "Vô hiệu hóa tài khoản người chơi thành công!";

        return Ok(BaseResponse<PlayerProfileResponse>.Ok(result, message));
    }
}