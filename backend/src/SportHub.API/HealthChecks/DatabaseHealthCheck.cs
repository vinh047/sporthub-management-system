using Microsoft.Extensions.Diagnostics.HealthChecks;
using SportHub.Infrastructure.Persistence;

namespace SportHub.API.HealthChecks;

/// <summary>Kiểm tra API có kết nối được SQL Server hay không</summary>
public class DatabaseHealthCheck(SportHubDbContext dbContext) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await dbContext.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("Kết nối SQL Server thành công.")
                : HealthCheckResult.Unhealthy("Không kết nối được SQL Server.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Lỗi khi kết nối SQL Server.", ex);
        }
    }
}
