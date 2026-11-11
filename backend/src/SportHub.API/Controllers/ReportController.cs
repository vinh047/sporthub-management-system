using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/reports")]
[Authorize(Roles = "ADMIN,STAFF")]
public class ReportController(IReportService reportService) : ApiControllerBase
{
    /// <summary>
    /// Thống kê Doanh thu theo Cơ sở, Môn thể thao, Khung giờ vàng & Ngày [UC26]
    /// </summary>
    [HttpGet("revenue")]
    public async Task<ActionResult<BaseResponse<RevenueReportResponse>>> Revenue(
        [FromQuery] int? facilityId = null,
        [FromQuery] int? sportId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] bool onlyPeakHours = false)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var resolvedTo = to ?? today;
        var resolvedFrom = from ?? resolvedTo.AddDays(-6);

        var result = await reportService.GetRevenueReportAsync(
            facilityId,
            resolvedFrom,
            resolvedTo,
            sportId,
            onlyPeakHours);

        return Ok(BaseResponse<RevenueReportResponse>.Ok(result));
    }

    /// <summary>
    /// Thống kê Tỷ lệ lấp đầy sân theo Cơ sở, Môn thể thao, Giờ vàng & Từng sân [UC26]
    /// </summary>
    [HttpGet("occupancy")]
    public async Task<ActionResult<BaseResponse<OccupancyReportResponse>>> Occupancy(
        [FromQuery] int? facilityId = null,
        [FromQuery] int? sportId = null,
        [FromQuery] DateOnly? date = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] bool onlyPeakHours = false)
    {
        var resolvedDate = date ?? to ?? DateOnly.FromDateTime(DateTime.Now);

        var result = await reportService.GetOccupancyReportAsync(
            facilityId,
            resolvedDate,
            from,
            to,
            sportId,
            onlyPeakHours);

        return Ok(BaseResponse<OccupancyReportResponse>.Ok(result));
    }

    /// <summary>
    /// Truy vấn tổng hợp Dashboard Analytics: Doanh thu & Tỷ lệ lấp đầy sân (theo cơ sở, môn, giờ vàng) [UC26]
    /// </summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<BaseResponse<DashboardAnalyticsResponse>>> Analytics(
        [FromQuery] int? facilityId = null,
        [FromQuery] int? sportId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] bool onlyPeakHours = false)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var resolvedTo = to ?? today;
        var resolvedFrom = from ?? resolvedTo.AddDays(-6);

        var result = await reportService.GetDashboardAnalyticsAsync(
            facilityId,
            resolvedFrom,
            resolvedTo,
            sportId,
            onlyPeakHours);

        return Ok(BaseResponse<DashboardAnalyticsResponse>.Ok(result));
    }
}
