using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SportHub.Infrastructure.Persistence;

namespace SportHub.Infrastructure.BackgroundJobs;

/// <summary>
/// Job chạy mỗi 1 phút — tự động expire các Booking đang ở trạng thái Held
/// quá 10 phút (HoldExpiresAt đã qua).
/// Dev 1 (Leader) sẽ implement phần này ở Tuần 4.
/// </summary>
public class HoldSlotExpiryJob(IServiceProvider services, ILogger<HoldSlotExpiryJob> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("🕐 HoldSlotExpiryJob started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();

                // TODO (Tuần 4): Query Bookings WHERE Status = Held AND HoldExpiresAt < UtcNow
                // → Update Status = Cancelled
                // → Log các booking bị expire

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in HoldSlotExpiryJob");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // retry sau 30s
            }
        }
    }
}
