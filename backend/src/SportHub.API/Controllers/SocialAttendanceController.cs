using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Authorize(Roles = "ADMIN,STAFF")]
[Route("api/social-sessions/{sessionId:int}/attendance")]
public class SocialAttendanceController(ISocialAttendanceService attendance) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int sessionId, CancellationToken ct) =>
        Ok(await attendance.ListAsync(sessionId, RequiredUserId, ct));

    [HttpPost("{ticketId:int}/check-in")]
    public async Task<IActionResult> CheckIn(int sessionId, int ticketId, CancellationToken ct) =>
        Ok(await attendance.CheckInAsync(sessionId, ticketId, RequiredUserId, ct));
}
