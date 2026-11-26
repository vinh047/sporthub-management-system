namespace SportHub.Application.DTOs.Report;

public record DashboardAnalyticsResponse(
    RevenueReportResponse Revenue,
    OccupancyReportResponse Occupancy
);
