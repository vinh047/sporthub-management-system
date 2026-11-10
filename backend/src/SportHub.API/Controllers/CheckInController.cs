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

    /// <summary>Tra cứu đơn hôm nay theo mã đơn, tên hoặc số điện thoại</summary>
    [HttpGet("lookup")]
    public async Task<ActionResult<BaseResponse<List<CheckInItem>>>> Lookup([FromQuery] string keyword)
        => Ok(BaseResponse<List<CheckInItem>>.Ok(
            await checkInService.LookupAsync(keyword, RequiredUserId, IsAdmin)));

    /// <summary>Danh sách khách đặt sân hôm nay của một cơ sở</summary>
    [HttpGet("today")]
    public async Task<ActionResult<BaseResponse<List<CheckInItem>>>> Today([FromQuery] int facilityId)
        => Ok(BaseResponse<List<CheckInItem>>.Ok(
            await checkInService.GetTodayAsync(facilityId, RequiredUserId, IsAdmin)));

    /// <summary>Lịch sử Check-in đã ghi nhận tại quầy POS của cơ sở</summary>
    [HttpGet("history")]
    public async Task<ActionResult<BaseResponse<List<CheckInHistoryItemDto>>>> History(
        [FromQuery] int facilityId,
        [FromQuery] DateOnly? date = null)
        => Ok(BaseResponse<List<CheckInHistoryItemDto>>.Ok(
            await checkInService.GetHistoryAsync(facilityId, date, RequiredUserId, IsAdmin)));

    /// <summary>Check-in một khung giờ của đơn</summary>
    [HttpPost]
    public async Task<ActionResult<BaseResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        await checkInService.CheckInAsync(request, RequiredUserId, IsAdmin);
        return Ok(BaseResponse.Ok("Check-in thành công!"));
    }

    /// <summary>Xem hồ sơ chi tiết và quản lý đơn đặt sân tại quầy Lễ tân</summary>
    [HttpGet("bookings/{bookingId:int}")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> GetBookingOrder(int bookingId)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.GetBookingOrderAsync(bookingId, RequiredUserId, IsAdmin)));

    /// <summary>Check-in tất cả khung giờ còn lại của đơn đặt sân</summary>
    [HttpPost("bookings/{bookingId:int}/check-in-all")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> CheckInAllSlots(
        int bookingId,
        [FromBody] CheckInAllSlotsRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.CheckInAllSlotsAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã Check-in toàn bộ các khung giờ của đơn!"));

    /// <summary>Hoàn tác (Undo) Check-in của một khung giờ nếu bấm nhầm</summary>
    [HttpDelete("details/{bookingDetailId:int}")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> UndoSlotCheckIn(int bookingDetailId)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.UndoSlotCheckInAsync(bookingDetailId, RequiredUserId, IsAdmin),
            "Đã hoàn tác Check-in khung giờ."));

    /// <summary>Thu tiền và xác nhận thanh toán tại quầy cho đơn đặt sân</summary>
    [HttpPost("bookings/{bookingId:int}/collect-payment")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> CollectPayment(
        int bookingId,
        [FromBody] CollectBookingPaymentRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.CollectPaymentAtCounterAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã thu tiền tại quầy và xác nhận đơn thành công!"));

    /// <summary>Check-out trả sân, hoàn tất đơn và cộng điểm tích lũy / uy tín cho khách</summary>
    [HttpPost("bookings/{bookingId:int}/checkout")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> Checkout(
        int bookingId,
        [FromBody] CheckoutBookingRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.CheckoutBookingAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã Check-out trả sân và hoàn tất đơn hàng!"));

    /// <summary>Đánh dấu khách vắng mặt (No-Show), trừ điểm uy tín và giải phóng sân</summary>
    [HttpPost("bookings/{bookingId:int}/no-show")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> MarkNoShow(
        int bookingId,
        [FromBody] MarkNoShowRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.MarkNoShowAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã đánh dấu khách vắng mặt (No-Show) và mở lại sân trống."));

    /// <summary>Hủy đơn đặt sân trực tiếp tại quầy Lễ tân</summary>
    [HttpPost("bookings/{bookingId:int}/cancel")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> CancelAtCounter(
        int bookingId,
        [FromBody] ReceptionCancelBookingRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.CancelBookingAtCounterAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã hủy đơn đặt sân tại quầy."));

    /// <summary>Cập nhật thông tin tên / SĐT người nhận sân</summary>
    [HttpPut("bookings/{bookingId:int}/customer")]
    public async Task<ActionResult<BaseResponse<ReceptionBookingDetailDto>>> UpdateGuestInfo(
        int bookingId,
        [FromBody] UpdateGuestInfoRequest request)
        => Ok(BaseResponse<ReceptionBookingDetailDto>.Ok(
            await checkInService.UpdateGuestInfoAsync(bookingId, request, RequiredUserId, IsAdmin),
            "Đã cập nhật thông tin khách nhận sân."));
}
