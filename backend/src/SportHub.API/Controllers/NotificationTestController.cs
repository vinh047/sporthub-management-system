using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Application.Common;
using SportHub.Application.Interfaces.Services;
using SportHub.Infrastructure.Persistence;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "ADMIN")]
public class NotificationTestController(
    INotificationService notificationService,
    SportHubDbContext db,
    IWebHostEnvironment environment
) : ControllerBase
{
    [HttpPost("send-to-player")]
    public async Task<IActionResult> SendToPlayer()
    {
        // Tìm tài khoản Player mẫu
        var player = await db.Users
            .FirstOrDefaultAsync(x => x.PhoneNumber == "0900000002");
        if (!environment.IsDevelopment())
        {
            return NotFound();
        }

        if (player is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Không tìm thấy tài khoản Player mẫu."
            });
        }

        // Gửi thông báo
        await notificationService.SendToUserAsync(
            player.Id,
            "WELCOME",
            new Dictionary<string, string>
            {
                ["FullName"] = player.FullName
            }
        );

        return Ok(new
        {
            success = true,
            message = $"Đã gửi thông báo đến {player.FullName}."
        });
    }
}