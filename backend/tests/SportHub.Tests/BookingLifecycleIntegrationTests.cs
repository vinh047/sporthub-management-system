using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using SportHub.Infrastructure.BackgroundJobs;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Tests;

public sealed class BookingLifecycleIntegrationTests
{
    [SqlServerFact]
    public async Task Concurrent_holds_for_the_same_slot_create_one_booking_and_return_one_conflict()
    {
        var connectionString = GetSqlServerConnectionString();
        var target = await FindAvailableTargetAsync(connectionString);
        var notifier = new RecordingCourtStatusNotifier();
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var startedAt = DateTime.UtcNow;

        async Task<(BookingResponse? Booking, bool Conflict)> AttemptHoldAsync()
        {
            await start.Task;
            using var context = CreateSqlServerContext(connectionString);
            using var unitOfWork = new UnitOfWork(context);
            var service = new BookingService(unitOfWork, new PricingService(unitOfWork), notifier);
            var request = new HoldSlotRequest(
                target.CourtId,
                target.PlayDate,
                target.TimeSlotId,
                "Concurrency integration test",
                "0900000000")
            {
                TimeSlotIds = [target.TimeSlotId]
            };

            try
            {
                return (await service.HoldSlotAsync(request), false);
            }
            catch (ConflictException)
            {
                return (null, true);
            }
        }

        try
        {
            var first = AttemptHoldAsync();
            var second = AttemptHoldAsync();
            start.SetResult();
            var results = await Task.WhenAll(first, second);

            Assert.Single(results, result => result.Booking is not null);
            Assert.Single(results, result => result.Conflict);

            using var verifyContext = CreateSqlServerContext(connectionString);
            var bookings = await verifyContext.Bookings
                .Where(booking => booking.CreatedAt >= startedAt.AddSeconds(-1) &&
                    booking.Details.Any(detail =>
                    detail.CourtId == target.CourtId &&
                    detail.PlayDate == target.PlayDate &&
                    detail.TimeSlotId == target.TimeSlotId))
                .ToListAsync();
            Assert.Single(bookings);
            Assert.Equal(BookingStatus.Held, bookings[0].BookingStatus);
        }
        finally
        {
            using var cleanupContext = CreateSqlServerContext(connectionString);
            var testBookings = await cleanupContext.Bookings
                .Where(booking => booking.CreatedAt >= startedAt.AddSeconds(-1) &&
                    booking.Details.Any(detail =>
                    detail.CourtId == target.CourtId &&
                    detail.PlayDate == target.PlayDate &&
                    detail.TimeSlotId == target.TimeSlotId))
                .ToListAsync();
            cleanupContext.Bookings.RemoveRange(testBookings);
            await cleanupContext.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Expiry_job_cancels_holds_past_grace_and_notifies_the_released_slot()
    {
        var databaseName = $"hold-expiry-{Guid.NewGuid():N}";
        var options = new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var playDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30);
        var expiredCode = TestBookingCode();
        var graceCode = TestBookingCode();

        using (var setupContext = new SportHubDbContext(options))
        {
            await setupContext.Database.EnsureCreatedAsync();
            setupContext.Facilities.Add(new Facility
            {
                Id = 1,
                Name = "Expiry test facility",
                Address = "Test address",
                Hotline = "0900000000"
            });
            setupContext.Sports.Add(new Sport
            {
                Id = 1,
                SportCode = "TEST",
                SportName = "Test sport"
            });
            setupContext.Courts.Add(new Court
            {
                Id = 1,
                FacilityId = 1,
                SportId = 1,
                CourtName = "Expiry test court",
                CourtType = CourtType.Indoor
            });
            setupContext.TimeSlots.AddRange(
                new TimeSlot { Id = 1, SlotIndex = 1, StartTime = new TimeOnly(6, 0), EndTime = new TimeOnly(7, 0) },
                new TimeSlot { Id = 2, SlotIndex = 2, StartTime = new TimeOnly(7, 0), EndTime = new TimeOnly(8, 0) });
            setupContext.Bookings.AddRange(
                CreateHeldBooking(expiredCode, playDate, 1, DateTime.UtcNow.AddMinutes(-14)),
                CreateHeldBooking(graceCode, playDate, 2, DateTime.UtcNow.AddMinutes(-1)));
            await setupContext.SaveChangesAsync();
        }

        var notifier = new RecordingCourtStatusNotifier();
        var services = new ServiceCollection();
        services.AddDbContext<SportHubDbContext>(builder => builder.UseInMemoryDatabase(databaseName));
        services.AddScoped<IBookingRepository, BookingRepository>();
        using var provider = services.BuildServiceProvider();
        var job = new HoldSlotExpiryJob(
            provider,
            notifier,
            NullLogger<HoldSlotExpiryJob>.Instance);

        await job.ProcessExpiredBookingsAsync();

        using var resultContext = new SportHubDbContext(options);
        var expired = await resultContext.Bookings.SingleAsync(booking => booking.BookingCode == expiredCode);
        var withinGrace = await resultContext.Bookings.SingleAsync(booking => booking.BookingCode == graceCode);

        Assert.Equal(BookingStatus.Cancelled, expired.BookingStatus);
        Assert.Equal(BookingStatus.Held, withinGrace.BookingStatus);
        var notification = Assert.Single(notifier.Events);
        Assert.Equal(1, notification.CourtId);
        Assert.Equal(1, notification.TimeSlotId);
        Assert.Equal(playDate, notification.Date);
        Assert.Equal("Available", notification.Status);
    }

    private static async Task<(int CourtId, int TimeSlotId, DateOnly PlayDate)> FindAvailableTargetAsync(
        string connectionString)
    {
        var playDate = new DateOnly(2099, 1, 1).AddDays(Random.Shared.Next(365));
        using var context = CreateSqlServerContext(connectionString);
        var timeSlotId = await context.TimeSlots
            .OrderBy(slot => slot.StartTime)
            .Select(slot => slot.Id)
            .FirstAsync();
        var courts = await context.Courts
            .AsNoTracking()
            .Where(court => court.IsActive)
            .OrderBy(court => court.Id)
            .Select(court => new { court.Id })
            .ToListAsync();
        using var unitOfWork = new UnitOfWork(context);

        foreach (var court in courts)
        {
            var prices = await new PricingService(unitOfWork).GetSlotPricesAsync(court.Id, playDate);
            if (!prices.ContainsKey(timeSlotId)) continue;
            if (await unitOfWork.Bookings.GetSlotStatusAsync(court.Id, playDate, timeSlotId) != "Available")
                continue;
            return (court.Id, timeSlotId, playDate);
        }

        throw new InvalidOperationException("No active court with an available price rule was found for the test date.");
    }

    private static SportHubDbContext CreateSqlServerContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<SportHubDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new SportHubDbContext(options);
    }

    private static string GetSqlServerConnectionString()
        => Environment.GetEnvironmentVariable("SPORTHUB_TEST_CONNECTION")
            ?? throw new InvalidOperationException("SPORTHUB_TEST_CONNECTION is required for SQL Server tests.");

    private static Booking CreateHeldBooking(
        string bookingCode,
        DateOnly playDate,
        int timeSlotId,
        DateTime holdExpiresAt)
        => new()
        {
            BookingCode = bookingCode,
            GuestName = "Expiry test",
            GuestPhone = "0900000000",
            TotalAmount = 100_000,
            FinalAmount = 100_000,
            BookingStatus = BookingStatus.Held,
            HoldExpiresAt = holdExpiresAt,
            Details =
            [
                new BookingDetail
                {
                    CourtId = 1,
                    PlayDate = playDate,
                    TimeSlotId = timeSlotId,
                    SlotPrice = 100_000
                }
            ]
        };

    private static string TestBookingCode() => $"T{Guid.NewGuid():N}"[..20];

    private sealed class RecordingCourtStatusNotifier : ICourtStatusNotifier
    {
        private readonly ConcurrentQueue<(int FacilityId, int CourtId, DateOnly Date, int TimeSlotId, string Status)> events = new();

        public IReadOnlyCollection<(int FacilityId, int CourtId, DateOnly Date, int TimeSlotId, string Status)> Events
            => events.ToArray();

        public Task NotifySlotUpdatedAsync(int facilityId, int courtId, DateOnly date, int timeSlotId, string status)
        {
            events.Enqueue((facilityId, courtId, date, timeSlotId, status));
            return Task.CompletedTask;
        }
    }
}
