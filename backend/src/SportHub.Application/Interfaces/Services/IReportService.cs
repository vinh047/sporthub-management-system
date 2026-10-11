using SportHub.Application.DTOs.Report;

namespace SportHub.Application.Interfaces.Services;

public interface IReportService
{
    Task<RevenueReportResponse> GetRevenueReportAsync(int facilityId, DateOnly from, DateOnly to);
    Task<OccupancyReportResponse> GetOccupancyReportAsync(int facilityId, DateOnly date);
}
