using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Tests;

public sealed class PaymentServiceTests
{
    [Fact]
    public async Task Signed_success_ipn_confirms_booking_and_duplicate_ipn_is_idempotent()
    {
        var (options, bookingCode) = await CreatePaymentDatabaseAsync();
        using var context = new SportHubDbContext(options);
        using var unitOfWork = new UnitOfWork(context);
        var notifier = new RecordingNotifier();
        var service = new PaymentService(
            unitOfWork,
            new AcceptingVnPayGateway(),
            notifier,
            NullLogger<PaymentService>.Instance);
        var parameters = CreateSuccessIpnParameters();

        var firstResponse = await service.ProcessVnPayIpnAsync(parameters, "127.0.0.1");
        var duplicateResponse = await service.ProcessVnPayIpnAsync(parameters, "127.0.0.1");

        var booking = await context.Bookings.SingleAsync(item => item.BookingCode == bookingCode);
        var payment = await context.PaymentTransactions.SingleAsync(item => item.ReferenceCode == "TXN-TEST");
        Assert.Equal("00", firstResponse.RspCode);
        Assert.Equal("00", duplicateResponse.RspCode);
        Assert.Equal(BookingStatus.Confirmed, booking.BookingStatus);
        Assert.Equal(PaymentStatus.Confirmed, payment.Status);
        Assert.Single(notifier.Events);
    }

    [Fact]
    public async Task Signed_ipn_with_amount_mismatch_does_not_confirm_booking()
    {
        var (options, bookingCode) = await CreatePaymentDatabaseAsync();
        using var context = new SportHubDbContext(options);
        using var unitOfWork = new UnitOfWork(context);
        var service = new PaymentService(
            unitOfWork,
            new AcceptingVnPayGateway(),
            new RecordingNotifier(),
            NullLogger<PaymentService>.Instance);
        var parameters = CreateSuccessIpnParameters();
        parameters["vnp_Amount"] = "1";

        var response = await service.ProcessVnPayIpnAsync(parameters, "127.0.0.1");

        var booking = await context.Bookings.SingleAsync(item => item.BookingCode == bookingCode);
        Assert.Equal("04", response.RspCode);
        Assert.Equal(BookingStatus.Held, booking.BookingStatus);
    }

    [Fact]
    public async Task Invalid_ipn_signature_is_rejected_before_order_lookup()
    {
        var options = new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase($"payment-invalid-ipn-{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        using var context = new SportHubDbContext(options);
        using var unitOfWork = new UnitOfWork(context);
        var service = new PaymentService(
            unitOfWork,
            new RejectingVnPayGateway(),
            new RecordingNotifier(),
            NullLogger<PaymentService>.Instance);

        var response = await service.ProcessVnPayIpnAsync(
            new Dictionary<string, string>(),
            "127.0.0.1");

        Assert.Equal("97", response.RspCode);
    }

    [Fact]
    public async Task Partial_cancellation_refund_is_sent_once_and_shown_as_processing()
    {
        var (options, bookingCode) = await CreatePaymentDatabaseAsync();
        using (var setupContext = new SportHubDbContext(options))
        {
            var booking = await setupContext.Bookings.SingleAsync(item => item.BookingCode == bookingCode);
            var payment = await setupContext.PaymentTransactions.SingleAsync(item => item.ReferenceCode == "TXN-TEST");
            booking.BookingStatus = BookingStatus.Cancelled;
            booking.Cancellation = new BookingCancellation
            {
                BookingId = booking.Id,
                CancelledByUserId = 1,
                CancelReason = "Test cancellation",
                RefundPercent = 50m,
                RefundAmount = 50000m,
                PenaltyAmount = 50000m,
                RefundStatus = RefundStatus.Pending
            };
            payment.Status = PaymentStatus.Confirmed;
            payment.ProviderTransactionId = "provider-transaction";
            payment.ProviderTransactionDate = DateTime.UtcNow.AddHours(-1);
            await setupContext.SaveChangesAsync();
        }

        using var context = new SportHubDbContext(options);
        using var unitOfWork = new UnitOfWork(context);
        var gateway = new AcceptingVnPayGateway();
        var service = new PaymentService(
            unitOfWork,
            gateway,
            new RecordingNotifier(),
            NullLogger<PaymentService>.Instance);

        var firstResult = await service.ProcessCancellationRefundAsync(1, 1, "127.0.0.1");
        var duplicateResult = await service.ProcessCancellationRefundAsync(1, 1, "127.0.0.1");
        var refund = await context.PaymentTransactions.SingleAsync(
            transaction => transaction.TransactionType == PaymentTransactionType.Refund);

        Assert.Equal("Processing", firstResult.RefundStatus);
        Assert.Equal("Processing", duplicateResult.RefundStatus);
        Assert.Single(gateway.RefundRequests);
        Assert.Equal(5000000, gateway.RefundRequests[0].Amount);
        Assert.Equal("03", gateway.RefundRequests[0].TransactionType);
        Assert.Equal(PaymentStatus.Confirmed, refund.Status);
    }

    private static async Task<(DbContextOptions<SportHubDbContext> Options, string BookingCode)> CreatePaymentDatabaseAsync()
    {
        var databaseName = $"payment-ipn-{Guid.NewGuid():N}";
        var options = new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase(databaseName)
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var bookingCode = $"BK-{Guid.NewGuid():N}"[..20];
        using var context = new SportHubDbContext(options);
        var user = new User
        {
            Id = 1,
            FullName = "Payment test user",
            PhoneNumber = "0900000000",
            PasswordHash = "test"
        };
        var facility = new Facility
        {
            Id = 1,
            Name = "Test facility",
            Address = "Test address",
            Hotline = "0900000000"
        };
        var sport = new Sport { Id = 1, SportCode = "TEST", SportName = "Test sport" };
        var court = new Court
        {
            Id = 1,
            FacilityId = facility.Id,
            SportId = sport.Id,
            CourtName = "Test court",
            CourtType = CourtType.Indoor,
            Facility = facility,
            Sport = sport
        };
        var timeSlot = new TimeSlot
        {
            Id = 1,
            SlotIndex = 1,
            StartTime = new TimeOnly(6, 0),
            EndTime = new TimeOnly(7, 0)
        };
        var paymentMethod = new PaymentMethod
        {
            Id = 5,
            MethodCode = "VNPAY",
            MethodName = "VNPay",
            IsActive = true
        };
        var booking = new Booking
        {
            Id = 1,
            BookingCode = bookingCode,
            UserId = user.Id,
            User = user,
            TotalAmount = 100000m,
            FinalAmount = 100000m,
            HoldExpiresAt = DateTime.UtcNow.AddMinutes(5),
            BookingStatus = BookingStatus.Held
        };
        booking.Details.Add(new BookingDetail
        {
            Id = 1,
            BookingId = booking.Id,
            CourtId = court.Id,
            Court = court,
            PlayDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
            TimeSlotId = timeSlot.Id,
            TimeSlot = timeSlot,
            SlotPrice = booking.FinalAmount
        });
        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            Id = 1,
            BookingId = booking.Id,
            Booking = booking,
            PaymentMethodId = paymentMethod.Id,
            PaymentMethod = paymentMethod,
            Amount = booking.FinalAmount,
            ReferenceCode = "TXN-TEST",
            Status = PaymentStatus.Pending,
            TransactionType = PaymentTransactionType.Payment
        });

        context.AddRange(user, facility, sport, court, timeSlot, paymentMethod, booking);
        await context.SaveChangesAsync();
        return (options, bookingCode);
    }

    private static Dictionary<string, string> CreateSuccessIpnParameters()
        => new(StringComparer.Ordinal)
        {
            ["vnp_TmnCode"] = "TESTTMN",
            ["vnp_TxnRef"] = "TXN-TEST",
            ["vnp_Amount"] = "10000000",
            ["vnp_ResponseCode"] = "00",
            ["vnp_TransactionStatus"] = "00",
            ["vnp_TransactionNo"] = "123456789",
            ["vnp_PayDate"] = DateTime.UtcNow.AddHours(7).ToString("yyyyMMddHHmmss")
        };

    private class AcceptingVnPayGateway : IVnPayGateway
    {
        public List<VnPayRefundRequest> RefundRequests { get; } = [];

        public string CreatePaymentUrl(string transactionReference, long amount, string orderInfo, string clientIp, DateTime createdAt, DateTime expiresAt)
            => "https://sandbox.vnpayment.vn/payment";

        public virtual bool IsValidSignature(IReadOnlyDictionary<string, string> parameters) => true;

        public virtual Task<VnPayRefundResult> RefundAsync(VnPayRefundRequest request, CancellationToken cancellationToken = default)
        {
            RefundRequests.Add(request);
            return Task.FromResult(new VnPayRefundResult(true, "00", "refund-id", "accepted"));
        }
    }

    private sealed class RejectingVnPayGateway : AcceptingVnPayGateway
    {
        public override bool IsValidSignature(IReadOnlyDictionary<string, string> parameters) => false;
    }

    private sealed class RecordingNotifier : ICourtStatusNotifier
    {
        public List<string> Events { get; } = [];

        public Task NotifySlotUpdatedAsync(int facilityId, int courtId, DateOnly date, int timeSlotId, string status)
        {
            Events.Add(status);
            return Task.CompletedTask;
        }
    }
}
