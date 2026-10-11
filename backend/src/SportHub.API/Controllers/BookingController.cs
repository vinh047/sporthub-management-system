using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Exceptions;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class BookingController(IBookingService bookingService) : ApiControllerBase
{
    /// <summary>Giữ chỗ 10 phút (hỗ trợ cả Player đăng nhập và Khách vãng lai)</summary>
    [HttpPost("hold")]
    public async Task<ActionResult<BaseResponse<BookingResponse>>> Hold([FromBody] HoldSlotRequest request)
    {
        var userId = CurrentUserId;

        if (userId is null && (string.IsNullOrWhiteSpace(request.GuestName) || string.IsNullOrWhiteSpace(request.GuestPhone)))
        {
            throw new ValidationException(["Vui lòng đăng nhập hoặc cung cấp họ tên và số điện thoại để giữ chỗ."]);
        }

        var result = await bookingService.HoldSlotAsync(request, userId);
        return StatusCode(201, BaseResponse<BookingResponse>.Ok(result, "Giữ chỗ thành công. Thanh toán trong 10 phút."));
    }

    /// <summary>Xác nhận thanh toán</summary>
    [HttpPost("{id}/confirm")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<BookingResponse>>> Confirm(int id, [FromBody] ConfirmBookingRequest request)
    {
        var result = await bookingService.ConfirmBookingAsync(id, request);
        return Ok(BaseResponse<BookingResponse>.Ok(result, "Đặt sân thành công!"));
    }

    /// <summary>Hủy đơn đặt sân</summary>
    [HttpPost("{id}/cancel")]
    [Authorize]
    public async Task<ActionResult<BaseResponse>> Cancel(int id, [FromBody] CancelBookingRequest request)
    {
        await bookingService.CancelBookingAsync(id, RequiredUserId, request.Reason);
        return Ok(BaseResponse.Ok("Hủy đơn thành công."));
    }

    /// <summary>Lịch sử đặt sân của user hiện tại</summary>
    [HttpGet("my-bookings")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<IEnumerable<BookingResponse>>>> GetMyBookings()
    {
        var result = await bookingService.GetUserBookingsAsync(RequiredUserId);
        return Ok(BaseResponse<IEnumerable<BookingResponse>>.Ok(result));
    }

    /// <summary>Chi tiết đơn đặt sân</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<BookingDetailResponse>>> GetDetail(int id)
    {
        var result = await bookingService.GetBookingDetailAsync(id);
        return Ok(BaseResponse<BookingDetailResponse>.Ok(result));
    }
}
