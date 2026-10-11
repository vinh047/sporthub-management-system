using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class CheckInController(ICheckInService checkInService) : ApiControllerBase
{
    /// <summary>Staff check-in khách vào sân</summary>
    [HttpPost]
    [Authorize(Roles = "STAFF,ADMIN")]
    public async Task<ActionResult<BaseResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        await checkInService.CheckInAsync(request, RequiredUserId);
        return Ok(BaseResponse.Ok("Check-in thành công!"));
    }
}
