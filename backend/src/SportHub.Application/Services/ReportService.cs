using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class ReportService(IUnitOfWork uow) : IReportService
{
    public Task<RevenueReportResponse> GetRevenueReportAsync(int facilityId, DateOnly from, DateOnly to) => throw new NotImplementedException();
    public Task<OccupancyReportResponse> GetOccupancyReportAsync(int facilityId, DateOnly date) => throw new NotImplementedException();
}
