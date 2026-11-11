using SportHub.Application.DTOs.Report;

namespace SportHub.Application.Interfaces.Services;

public interface IReportService
{
    Task<RevenueReportResponse> GetRevenueReportAsync(
        int? facilityId,
        DateOnly from,
        DateOnly to,
        int? sportId = null,
        bool onlyPeakHours = false);

    Task<OccupancyReportResponse> GetOccupancyReportAsync(
        int? facilityId,
        DateOnly date,
        DateOnly? from = null,
        DateOnly? to = null,
        int? sportId = null,
        bool onlyPeakHours = false);

    Task<DashboardAnalyticsResponse> GetDashboardAnalyticsAsync(
        int? facilityId,
        DateOnly from,
        DateOnly to,
        int? sportId = null,
        bool onlyPeakHours = false);
}
