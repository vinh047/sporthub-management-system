using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Notifications;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
[Authorize]
public class NotificationsController(
    INotificationService notificationService) : ApiControllerBase
{
    // Người dùng lấy danh sách thông báo của chính mình
    [HttpGet]
    public async Task<ActionResult<BaseResponse<IEnumerable<NotificationResponse>>>> GetMyNotifications()
    {
        var userId = GetCurrentUserId();

        var result = await notificationService.GetMyNotificationsAsync(userId);

        return Ok(BaseResponse<IEnumerable<NotificationResponse>>.Ok(result));
    }

    // Người dùng đánh dấu một thông báo đã đọc
    [HttpPut("{id:int}/read")]
    public async Task<ActionResult<BaseResponse<bool>>> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId();

        var result = await notificationService.MarkAsReadAsync(id, userId);

        if (!result)
        {
            return NotFound(BaseResponse<bool>.Ok(
                false,
                "Không tìm thấy thông báo."
            ));
        }

        return Ok(BaseResponse<bool>.Ok(
            true,
            "Đánh dấu thông báo đã đọc thành công!"
        ));
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