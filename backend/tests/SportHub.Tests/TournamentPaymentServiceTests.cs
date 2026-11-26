using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Tests;

public sealed class TournamentPaymentServiceTests
{
    [Fact]
    public async Task My_tournaments_only_contains_teams_of_the_authenticated_participant()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        db.TournamentTeams.Add(new TournamentTeam
        {
            TournamentId = 1, TeamName = "Other team",
            Athletes = [new TournamentAthlete { User = new User { Id = 2, FullName = "Other captain" }, IsCaptain = true }]
        });
        await db.SaveChangesAsync();
        var service = new TournamentService(uow);
        var mine = await service.GetMyTournamentsAsync(1);
        Assert.Equal(1, Assert.Single(Assert.Single(mine).Teams).Id);
        Assert.Empty(await service.GetMyTournamentsAsync(99));
    }

    [Fact]
    public async Task Legacy_unpaid_approved_team_is_presented_as_waiting_without_mutating_history()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var team = await db.TournamentTeams.SingleAsync();
        team.Status = "Approved";
        await db.SaveChangesAsync();
        var service = new TournamentService(uow);
        var mine = await service.GetMyTournamentsAsync(1);
        Assert.Equal("Registered", Assert.Single(Assert.Single(mine).Teams).Status);
        Assert.Equal("Approved", team.Status);
    }

    [Fact]
    public async Task Successful_payment_does_not_reinstate_disqualified_team()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var service = new TournamentPaymentService(uow, new Gateway());
        var link = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        (await db.TournamentTeams.SingleAsync()).Status = "Disqualified";
        await db.SaveChangesAsync();
        await service.ProcessVnPayIpnAsync(Parameters(link.ReferenceCode));
        Assert.Equal("Disqualified", (await db.TournamentTeams.SingleAsync()).Status);
        Assert.Equal(PaymentStatus.Confirmed, (await db.PaymentTransactions.SingleAsync()).Status);
    }

    [Theory]
    [InlineData("OpenReg")]
    [InlineData("DrawCompleted")]
    [InlineData("InProgress")]
    public async Task Registered_team_can_pay_after_registration_deadline(string status)
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var tournament = await db.Tournaments.SingleAsync();
        tournament.RegistrationDeadline = DateTime.UtcNow.AddDays(-1);
        tournament.Status = status;
        await db.SaveChangesAsync();
        var service = new TournamentPaymentService(uow, new Gateway());
        var link = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        Assert.True(link.ExpiresAt > DateTime.UtcNow.AddMinutes(14));
        Assert.Equal(link, await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1"));
    }

    [Theory]
    [InlineData("Finished", "Approved")]
    [InlineData("Draft", "Approved")]
    [InlineData("OpenReg", "Disqualified")]
    public async Task Ineligible_tournament_or_team_cannot_pay(string status, string teamStatus)
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        (await db.Tournaments.SingleAsync()).Status = status;
        (await db.TournamentTeams.SingleAsync()).Status = teamStatus;
        await db.SaveChangesAsync();
        var service = new TournamentPaymentService(uow, new Gateway());
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1"));
        Assert.Empty(db.PaymentTransactions);
    }

    [Fact]
    public async Task Create_uses_database_fee_and_reuses_pending_payment()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var gateway = new Gateway();
        var service = new TournamentPaymentService(uow, gateway);
        var first = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        var second = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        Assert.Equal(first, second);
        Assert.Equal(200000m, first.Amount);
        Assert.Equal(20000000, gateway.Amount);
        Assert.Single(db.PaymentTransactions);
        Assert.Null((await db.PaymentTransactions.SingleAsync()).BookingId);
    }

    [Fact]
    public async Task Non_captain_cannot_create_or_read_payment()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var service = new TournamentPaymentService(uow, new Gateway());
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateVnPayPaymentAsync(1, 1, 2, "127.0.0.1"));
        await Assert.ThrowsAsync<ForbiddenException>(() => service.GetPaymentStatusAsync(1, 1, 2));
        Assert.Empty(db.PaymentTransactions);
    }

    [Fact]
    public async Task Return_does_not_confirm_and_repeated_ipn_cannot_downgrade_success()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var service = new TournamentPaymentService(uow, new Gateway());
        var link = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        var parameters = Parameters(link.ReferenceCode);
        var result = await service.ValidateVnPayReturnAsync(parameters);
        Assert.True(result.IsValid);
        Assert.True(result.PaymentReportedSuccessful);
        Assert.Equal(1, result.TeamId);
        Assert.Equal(PaymentStatus.Pending, (await db.PaymentTransactions.SingleAsync()).Status);
        Assert.Equal("Registered", (await db.TournamentTeams.SingleAsync()).Status);
        Assert.Equal("00", (await service.ProcessVnPayIpnAsync(parameters)).RspCode);
        Assert.Equal("Approved", (await db.TournamentTeams.SingleAsync()).Status);
        var processedAt = (await db.PaymentTransactions.SingleAsync()).ProcessedAt;
        Assert.Equal("00", (await service.ProcessVnPayIpnAsync(parameters)).RspCode);
        parameters["vnp_ResponseCode"] = "24";
        Assert.Equal("00", (await service.ProcessVnPayIpnAsync(parameters)).RspCode);
        Assert.Equal(PaymentStatus.Confirmed, (await db.PaymentTransactions.SingleAsync()).Status);
        Assert.Equal(processedAt, (await db.PaymentTransactions.SingleAsync()).ProcessedAt);
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1"));
    }

    [Theory]
    [InlineData("vnp_Amount", "1", "04")]
    [InlineData("vnp_PayDate", "invalid", "04")]
    [InlineData("vnp_TxnRef", "unknown", "01")]
    [InlineData("signature", "invalid", "97")]
    public async Task Invalid_callback_does_not_confirm(string key, string value, string expected)
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var service = new TournamentPaymentService(uow, new Gateway());
        var link = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        var parameters = Parameters(link.ReferenceCode);
        parameters[key] = value;
        Assert.Equal(expected, (await service.ProcessVnPayIpnAsync(parameters)).RspCode);
        Assert.Equal(PaymentStatus.Pending, (await db.PaymentTransactions.SingleAsync()).Status);
        Assert.Equal("Registered", (await db.TournamentTeams.SingleAsync()).Status);
    }

    [Fact]
    public async Task Failed_payment_can_retry_but_expired_pending_payment_requires_reconciliation()
    {
        using var db = await CreateDatabaseAsync();
        using var uow = new UnitOfWork(db);
        var service = new TournamentPaymentService(uow, new Gateway());
        var first = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        var parameters = Parameters(first.ReferenceCode);
        parameters["vnp_ResponseCode"] = "24";
        await service.ProcessVnPayIpnAsync(parameters);
        Assert.Equal("Registered", (await db.TournamentTeams.SingleAsync()).Status);
        var retry = await service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1");
        Assert.NotEqual(first.ReferenceCode, retry.ReferenceCode);
        var pending = await db.PaymentTransactions.SingleAsync(p => p.Status == PaymentStatus.Pending);
        pending.CreatedAt = DateTime.UtcNow.AddHours(-1);
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateVnPayPaymentAsync(1, 1, 1, "127.0.0.1"));
    }

    private static Dictionary<string, string> Parameters(string reference) => new()
    {
        ["vnp_TxnRef"] = reference, ["vnp_Amount"] = "20000000", ["vnp_ResponseCode"] = "00",
        ["vnp_TransactionStatus"] = "00", ["vnp_TransactionNo"] = "123456", ["vnp_PayDate"] = "20261109120000"
    };

    private static async Task<SportHubDbContext> CreateDatabaseAsync()
    {
        var db = new SportHubDbContext(new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
        var user = new User { Id = 1, FullName = "Captain" };
        var tournament = new Tournament
        {
            Id = 1, Name = "Tournament", Status = "OpenReg", EntryFee = 200000m,
            RegistrationDeadline = DateTime.UtcNow.AddDays(1), Facility = new Facility { Name = "Facility" },
            Sport = new Sport { SportCode = "TEST", SportName = "Test" }, CreatedByStaff = user,
            Teams = [new TournamentTeam { Id = 1, TeamName = "Team", Athletes = [new TournamentAthlete { User = user, IsCaptain = true }] }]
        };
        db.AddRange(tournament, new PaymentMethod { MethodCode = "VNPAY", MethodName = "VNPay", IsActive = true });
        await db.SaveChangesAsync();
        return db;
    }

    private sealed class Gateway : IVnPayGateway
    {
        public long Amount { get; private set; }
        public string CreatePaymentUrl(string transactionReference, long amount, string orderInfo, string clientIp, DateTime createdAt, DateTime expiresAt)
        {
            Amount = amount;
            return "https://example.com/" + transactionReference;
        }
        public bool IsValidSignature(IReadOnlyDictionary<string, string> parameters) => !parameters.ContainsKey("signature");
        public Task<VnPayRefundResult> RefundAsync(VnPayRefundRequest request, CancellationToken cancellationToken = default)
            => throw new NotSupportedException();
    }
}
