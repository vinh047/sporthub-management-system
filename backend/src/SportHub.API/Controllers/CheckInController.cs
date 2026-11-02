using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.CheckIn;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/checkin")]
[Authorize(Roles = "STAFF,ADMIN")]
public class CheckInController(ICheckInService checkInService) : ApiControllerBase
{
    private bool IsAdmin => CurrentUserRole == "ADMIN";

    /// <summary>Tra cứu đơn hôm nay theo mã đơn hoặc số điện thoại</summary>
    [HttpGet("lookup")]
    public async Task<ActionResult<BaseResponse<List<CheckInItem>>>> Lookup([FromQuery] string keyword)
        => Ok(BaseResponse<List<CheckInItem>>.Ok(
            await checkInService.LookupAsync(keyword, RequiredUserId, IsAdmin)));

    /// <summary>Danh sách khách đặt sân hôm nay của một cơ sở</summary>
    [HttpGet("today")]
    public async Task<ActionResult<BaseResponse<List<CheckInItem>>>> Today([FromQuery] int facilityId)
        => Ok(BaseResponse<List<CheckInItem>>.Ok(
            await checkInService.GetTodayAsync(facilityId, RequiredUserId, IsAdmin)));

    /// <summary>Check-in một khung giờ của đơn</summary>
    [HttpPost]
    public async Task<ActionResult<BaseResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        await checkInService.CheckInAsync(request, RequiredUserId, IsAdmin);
        return Ok(BaseResponse.Ok("Check-in thành công!"));
    }
}
