using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/reports")]
[Authorize(Roles = "ADMIN")]
public class ReportController(IReportService reportService) : ApiControllerBase
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
