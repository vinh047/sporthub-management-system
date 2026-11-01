using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Pos;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/pos")]
[Authorize(Roles = "STAFF,ADMIN")]
public class PosController(IPosService posService) : ApiControllerBase
{
    /// <summary>Bán sân tại quầy cho khách vãng lai (đơn xác nhận ngay)</summary>
    [HttpPost("bookings")]
    public async Task<ActionResult<BaseResponse<PosBookingResponse>>> CreateBooking([FromBody] PosBookingRequest request)
    {
        var result = await posService.CreateBookingAsync(request, RequiredUserId, CurrentUserRole == "ADMIN");
        return StatusCode(201, BaseResponse<PosBookingResponse>.Ok(result, $"Đặt sân thành công! Mã đơn: {result.BookingCode}"));
    }
}
