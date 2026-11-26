using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Infrastructure.BackgroundJobs;

/// <summary>
/// Quét Social Participants mỗi phút; logic Booking vẫn thuộc TV1.
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
                var attendance = scope.ServiceProvider.GetRequiredService<ISocialAttendanceService>();
                var count = await attendance.ScanNoShowsAsync(stoppingToken);
                if (count > 0) logger.LogInformation("Social NoShow: {Count} tickets processed", count);

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
