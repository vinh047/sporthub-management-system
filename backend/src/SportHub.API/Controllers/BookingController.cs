using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Exceptions;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class BookingController(IBookingService bookingService, IPaymentService paymentService) : ApiControllerBase
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

    /// <summary>Hủy đơn đặt sân</summary>
    [HttpPost("{id}/cancel")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<BookingPaymentStatusResponse>>> Cancel(
        int id,
        [FromBody] CancelBookingRequest request,
        CancellationToken cancellationToken)
    {
        await bookingService.CancelBookingAsync(id, RequiredUserId, request.Reason);
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await paymentService.ProcessCancellationRefundAsync(
            id,
            RequiredUserId,
            clientIp,
            cancellationToken);
        return Ok(BaseResponse<BookingPaymentStatusResponse>.Ok(
            result,
            result.RefundStatus == "Processing"
                ? "Đã hủy đơn. Yêu cầu hoàn tiền đang được xử lý; dự kiến nhận tiền sau 1–3 ngày làm việc."
                : "Đã hủy đơn."));
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
    [Authorize]
    public async Task<ActionResult<BaseResponse<BookingDetailResponse>>> GetDetail(int id)
    {
        var result = await bookingService.GetBookingDetailAsync(id, RequiredUserId);
        return Ok(BaseResponse<BookingDetailResponse>.Ok(result));
    }
}
