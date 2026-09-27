using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.DTOs.MatchRoom;
using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Services;
using System.Security.Claims;

namespace SportHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Đăng ký tài khoản Player mới</summary>
    [HttpPost("register")]
    public async Task<ActionResult<BaseResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        var result = await authService.RegisterAsync(request);
        return StatusCode(201, BaseResponse<AuthResponse>.Ok(result, "Đăng ký thành công!"));
    }

    /// <summary>Đăng nhập (Player, Staff, Admin)</summary>
    [HttpPost("login")]
    public async Task<ActionResult<BaseResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        var result = await authService.LoginAsync(request);
        return Ok(BaseResponse<AuthResponse>.Ok(result));
    }

    /// <summary>Cập nhật hồ sơ thể thao (môn + trình độ)</summary>
    [HttpPut("sport-profile")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse>> UpdateSportProfile([FromBody] UpdateSportProfileRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.UpdateSportProfileAsync(userId, request);
        return Ok(BaseResponse.Ok("Cập nhật hồ sơ thành công!"));
    }
}

[ApiController]
[Route("api/[controller]")]
public class FacilityController(IFacilityService facilityService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BaseResponse<IEnumerable<FacilityResponse>>>> GetAll()
    {
        var result = await facilityService.GetAllFacilitiesAsync();
        return Ok(BaseResponse<IEnumerable<FacilityResponse>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<FacilityDetailResponse>>> GetById(int id)
    {
        var result = await facilityService.GetFacilityDetailAsync(id);
        return Ok(BaseResponse<FacilityDetailResponse>.Ok(result));
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<FacilityResponse>>> Create([FromBody] CreateFacilityRequest request)
    {
        var result = await facilityService.CreateFacilityAsync(request);
        return StatusCode(201, BaseResponse<FacilityResponse>.Ok(result));
    }

    [HttpPut("{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<FacilityResponse>>> Update(int id, [FromBody] UpdateFacilityRequest request)
    {
        var result = await facilityService.UpdateFacilityAsync(id, request);
        return Ok(BaseResponse<FacilityResponse>.Ok(result));
    }
}

[ApiController]
[Route("api/[controller]")]
public class CourtController(ICourtService courtService) : ControllerBase
{
    /// <summary>Lấy danh sách slot trống theo cơ sở + môn + ngày</summary>
    [HttpGet("availability")]
    public async Task<ActionResult<BaseResponse<IEnumerable<CourtAvailabilityResponse>>>> GetAvailability(
        [FromQuery] int facilityId, [FromQuery] int sportId, [FromQuery] DateOnly date)
    {
        var result = await courtService.GetAvailableCourtSlotsAsync(facilityId, sportId, date);
        return Ok(BaseResponse<IEnumerable<CourtAvailabilityResponse>>.Ok(result));
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<CourtResponse>>> Create([FromBody] CreateCourtRequest request)
    {
        var result = await courtService.CreateCourtAsync(request);
        return StatusCode(201, BaseResponse<CourtResponse>.Ok(result));
    }

    [HttpPost("maintenance")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse>> LockForMaintenance([FromBody] LockCourtRequest request)
    {
        await courtService.LockCourtForMaintenanceAsync(request);
        return Ok(BaseResponse.Ok("Sân đã được khóa bảo trì."));
    }
}

[ApiController]
[Route("api/[controller]")]
public class BookingController(IBookingService bookingService) : ControllerBase
{
    /// <summary>Giữ chỗ 10 phút (có race condition protection)</summary>
    [HttpPost("hold")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse<BookingResponse>>> Hold([FromBody] HoldSlotRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await bookingService.HoldSlotAsync(request, userId);
        return StatusCode(201, BaseResponse<BookingResponse>.Ok(result, "Giữ chỗ thành công. Thanh toán trong 10 phút."));
    }

    /// <summary>Xác nhận thanh toán</summary>
    [HttpPost("{id}/confirm")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse<BookingResponse>>> Confirm(int id, [FromBody] ConfirmBookingRequest request)
    {
        var result = await bookingService.ConfirmBookingAsync(id, request);
        return Ok(BaseResponse<BookingResponse>.Ok(result, "Đặt sân thành công!"));
    }

    /// <summary>Hủy đơn đặt sân</summary>
    [HttpPost("{id}/cancel")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse>> Cancel(int id, [FromBody] string reason)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await bookingService.CancelBookingAsync(id, userId, reason);
        return Ok(BaseResponse.Ok("Hủy đơn thành công."));
    }

    /// <summary>Lịch sử đặt sân của user hiện tại</summary>
    [HttpGet("my-bookings")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse<IEnumerable<BookingResponse>>>> GetMyBookings()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await bookingService.GetUserBookingsAsync(userId);
        return Ok(BaseResponse<IEnumerable<BookingResponse>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<BookingDetailResponse>>> GetDetail(int id)
    {
        var result = await bookingService.GetBookingDetailAsync(id);
        return Ok(BaseResponse<BookingDetailResponse>.Ok(result));
    }
}

[ApiController]
[Route("api/[controller]")]
public class CheckInController(ICheckInService checkInService) : ControllerBase
{
    /// <summary>Staff check-in khách vào sân</summary>
    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "STAFF,ADMIN")]
    public async Task<ActionResult<BaseResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        var staffId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await checkInService.CheckInAsync(request, staffId);
        return Ok(BaseResponse.Ok("Check-in thành công!"));
    }
}

[ApiController]
[Route("api/matchrooms")]
public class MatchRoomController(IMatchRoomService matchRoomService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BaseResponse<PagedResult<MatchRoomSummary>>>> Search(
        [FromQuery] SearchRoomsRequest request)
    {
        var result = await matchRoomService.SearchRoomsAsync(request);
        return Ok(BaseResponse<PagedResult<MatchRoomSummary>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<MatchRoomDetailResponse>>> GetDetail(int id)
    {
        var result = await matchRoomService.GetRoomDetailAsync(id);
        return Ok(BaseResponse<MatchRoomDetailResponse>.Ok(result));
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse<MatchRoomResponse>>> Create([FromBody] CreateRoomRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await matchRoomService.CreateRoomAsync(request, userId);
        return StatusCode(201, BaseResponse<MatchRoomResponse>.Ok(result));
    }

    [HttpPost("{id}/join")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse>> Join(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await matchRoomService.JoinRoomAsync(id, userId);
        return Ok(BaseResponse.Ok("Tham gia phòng thành công!"));
    }

    [HttpPost("{id}/leave")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse>> Leave(int id, [FromBody] string? reason)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await matchRoomService.LeaveRoomAsync(id, userId, reason);
        return Ok(BaseResponse.Ok("Đã rút khỏi phòng."));
    }

    [HttpPost("{id}/close")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<BaseResponse>> Close(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await matchRoomService.CloseRoomAsync(id, userId);
        return Ok(BaseResponse.Ok("Phòng đã được đóng."));
    }
}

[ApiController]
[Route("api/reports")]
[Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN")]
public class ReportController(IReportService reportService) : ControllerBase
{
    [HttpGet("revenue")]
    public async Task<ActionResult<BaseResponse<RevenueReportResponse>>> Revenue(
        [FromQuery] int facilityId, [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        var result = await reportService.GetRevenueReportAsync(facilityId, from, to);
        return Ok(BaseResponse<RevenueReportResponse>.Ok(result));
    }

    [HttpGet("occupancy")]
    public async Task<ActionResult<BaseResponse<OccupancyReportResponse>>> Occupancy(
        [FromQuery] int facilityId, [FromQuery] DateOnly date)
    {
        var result = await reportService.GetOccupancyReportAsync(facilityId, date);
        return Ok(BaseResponse<OccupancyReportResponse>.Ok(result));
    }
}

