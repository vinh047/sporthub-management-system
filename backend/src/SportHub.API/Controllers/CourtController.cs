using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class CourtController(ICourtService courtService) : ApiControllerBase
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
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<CourtResponse>>> Create([FromBody] CreateCourtRequest request)
    {
        var result = await courtService.CreateCourtAsync(request);
        return StatusCode(201, BaseResponse<CourtResponse>.Ok(result));
    }

    [HttpPost("maintenance")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse>> LockForMaintenance([FromBody] LockCourtRequest request)
    {
        await courtService.LockCourtForMaintenanceAsync(request);
        return Ok(BaseResponse.Ok("Sân đã được khóa bảo trì."));
    }
}
