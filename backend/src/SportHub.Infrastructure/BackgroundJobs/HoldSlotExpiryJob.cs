using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Enums;
using SportHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace SportHub.Infrastructure.BackgroundJobs;

/// <summary>
/// Job chạy mỗi 1 phút — expire Booking Held sau hạn giữ 10 phút và 2 phút grace.
/// </summary>
public class HoldSlotExpiryJob(
    IServiceProvider services,
    ICourtStatusNotifier courtStatusNotifier,
    ILogger<HoldSlotExpiryJob> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("🕐 HoldSlotExpiryJob started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredBookingsAsync(stoppingToken);
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

    public async Task ProcessExpiredBookingsAsync(CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();
        var expiredAt = DateTime.UtcNow.AddMinutes(-2);
        var expiredBookings = await db.Bookings
            .Include(booking => booking.Details)
            .ThenInclude(detail => detail.Court)
            .Where(booking =>
                booking.BookingStatus == BookingStatus.Held &&
                booking.HoldExpiresAt != null &&
                booking.HoldExpiresAt < expiredAt)
            .ToListAsync(cancellationToken);

        if (expiredBookings.Count == 0) return;

        foreach (var booking in expiredBookings)
            booking.BookingStatus = BookingStatus.Cancelled;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Expired {BookingCount} held bookings.", expiredBookings.Count);

        var bookings = scope.ServiceProvider.GetRequiredService<IBookingRepository>();
        foreach (var booking in expiredBookings)
        foreach (var detail in booking.Details)
        {
            var status = await bookings.GetSlotStatusAsync(
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId);
            await courtStatusNotifier.NotifySlotUpdatedAsync(
                detail.Court.FacilityId,
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId,
                status);
        }
    }
}
