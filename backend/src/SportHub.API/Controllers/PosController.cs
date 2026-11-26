using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.CheckIn;
using SportHub.Application.DTOs.Pos;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/pos")]
[Authorize(Roles = "STAFF,ADMIN")]
public class PosController(IPosService posService, ICheckInService checkInService) : ApiControllerBase
{
    private bool IsAdmin => CurrentUserRole == "ADMIN";

    /// <summary>Tìm kiếm khách thành viên theo SĐT hoặc tên tại quầy POS</summary>
    [HttpGet("customers")]
    public async Task<ActionResult<BaseResponse<List<PosCustomerDto>>>> SearchCustomers([FromQuery] string keyword)
        => Ok(BaseResponse<List<PosCustomerDto>>.Ok(await posService.SearchCustomersAsync(keyword)));

    /// <summary>Bán sân tại quầy cho khách vãng lai hoặc thành viên (đơn xác nhận ngay)</summary>
    [HttpPost("bookings")]
    public async Task<ActionResult<BaseResponse<PosBookingResponse>>> CreateBooking([FromBody] PosBookingRequest request)
    {
        var result = await posService.CreateBookingAsync(request, RequiredUserId, IsAdmin);
        return StatusCode(201, BaseResponse<PosBookingResponse>.Ok(result, $"Đặt sân thành công! Mã đơn: {result.BookingCode}"));
    }

    /// <summary>Ghi nhận lịch sử Check-in tại quầy POS</summary>
    [HttpPost("check-ins")]
    public async Task<ActionResult<BaseResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        await checkInService.CheckInAsync(request, RequiredUserId, IsAdmin);
        return Ok(BaseResponse.Ok("Check-in tại quầy POS thành công!"));
    }

    /// <summary>Lấy danh sách lịch sử Check-in tại quầy POS</summary>
    [HttpGet("check-ins")]
    public async Task<ActionResult<BaseResponse<List<CheckInHistoryItemDto>>>> GetCheckInHistory(
        [FromQuery] int facilityId,
        [FromQuery] DateOnly? date = null)
        => Ok(BaseResponse<List<CheckInHistoryItemDto>>.Ok(
            await checkInService.GetHistoryAsync(facilityId, date, RequiredUserId, IsAdmin)));
}
