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

/// <summary>
/// Job chạy mỗi 1 phút — quét danh sách BookingDetails đã kết thúc giờ chơi
/// nhưng chưa được check-in → đánh NoShow và trừ 20 điểm uy tín.
/// Dev 1 (Leader) sẽ implement phần này ở Tuần 6.
/// </summary>
public class NoShowScannerJob(IServiceProvider services, ILogger<NoShowScannerJob> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("👁️ NoShowScannerJob started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();

                // TODO (Tuần 6):
                // 1. Query BookingDetails WHERE PlayDate+StartTime < UtcNow - 30min
                //    AND Booking.Status = Confirmed
                // 2. For each detail: find members NOT in CheckInLogs
                // 3. Mark MemberStatus = NoShow
                // 4. ReputationService.AddDelta(userId, -20, "Vắng mặt không check-in")
                // 5. If ReputationScore < 50: lock user

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in NoShowScannerJob");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }
}
