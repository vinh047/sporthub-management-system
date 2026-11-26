using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Tests;

public class TournamentBracketTests
{
    [Fact]
    public async Task Paid_tournament_includes_only_confirmed_payments()
    {
        using var db = await CreateDbAsync(4);
        using var uow = new UnitOfWork(db);
        (await db.Tournaments.SingleAsync()).EntryFee = 150000;
        var method = new PaymentMethod { MethodCode = "VNPAY", MethodName = "VNPay", IsActive = true };
        foreach (var id in new[] { 1, 2 }) db.PaymentTransactions.Add(new PaymentTransaction
        {
            TournamentTeamId = id, PaymentMethod = method, Amount = 150000, Status = PaymentStatus.Confirmed
        });
        await db.SaveChangesAsync();
        var bracket = await new TournamentBracketService(uow, new Recorder()).GenerateAsync(1, 1, true);
        Assert.Single(bracket.Matches);
        Assert.Equal(1, bracket.Matches[0].Team1Id);
        Assert.Equal(2, bracket.Matches[0].Team2Id);
    }

    [Fact]
    public async Task Pending_payment_blocks_generation_until_reconciliation()
    {
        using var db = await CreateDbAsync(3);
        using var uow = new UnitOfWork(db);
        (await db.Tournaments.SingleAsync()).EntryFee = 150000;
        (await db.TournamentTeams.SingleAsync(t => t.Id == 3)).Status = "Registered";
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            TournamentTeamId = 3, Amount = 150000, Status = PaymentStatus.Pending,
            PaymentMethod = new PaymentMethod { MethodCode = "VNPAY", MethodName = "VNPay", IsActive = true }
        });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ConflictException>(() => new TournamentBracketService(uow, new Recorder()).GenerateAsync(1, 1, true));
        Assert.Empty(db.TournamentMatches);
    }

    [Fact]
    public void All_sizes_have_unique_entrants_valid_byes_and_one_champion()
    {
        for (var count = 2; count <= 64; count++)
        {
            var matches = BinaryBracketGenerator.Generate(1, Enumerable.Range(1, count).ToList());
            var capacity = 2;
            while (capacity < count) capacity *= 2;
            Assert.Equal(capacity - 1, matches.Count);
            var first = matches.Where(m => m.RoundNumber == 1).ToList();
            var entrants = first.SelectMany(m => new[] { m.Team1Id, m.Team2Id }).Where(id => id.HasValue).Select(id => id!.Value);
            Assert.Equal(Enumerable.Range(1, count), entrants.Order());
            Assert.Equal(capacity - count, first.Count(m => m.Status == "Walkover"));
            Assert.All(first, m => Assert.True(m.Team1Id.HasValue || m.Team2Id.HasValue));
            foreach (var match in matches.OrderBy(m => m.RoundNumber).ThenBy(m => m.MatchOrder))
            {
                if (match.Status == "Walkover") continue;
                Assert.NotNull(match.Team1Id);
                Assert.NotNull(match.Team2Id);
                Assert.NotEqual(match.Team1Id, match.Team2Id);
                match.WinnerTeamId = match.Team1Id;
                BinaryBracketGenerator.Advance(matches, match);
            }
            Assert.NotNull(matches.Last().WinnerTeamId);
        }
    }

    [Fact]
    public async Task Sets_advance_winner_and_finish_final_with_idempotent_retries()
    {
        using var db = await CreateDbAsync(3);
        using var uow = new UnitOfWork(db);
        var notifier = new Recorder();
        var service = new TournamentBracketService(uow, notifier);
        var bracket = await service.GenerateAsync(1, 1, true);
        Assert.Equal("DrawCompleted", bracket.Status);
        Assert.Single(bracket.Matches, m => m.Status == "Walkover");
        await Assert.ThrowsAsync<ConflictException>(() => service.GenerateAsync(1, 1, true));
        var semi = bracket.Matches.Single(m => m.RoundNumber == 1 && m.Status != "Walkover");
        var next = bracket.Matches.Single(m => m.Id == semi.NextMatchId);
        Assert.Null(next.Team2Id);
        bracket = await service.RecordSetAsync(1, semi.Id, 1, new(21, 10, bracket.Version), 1, true);
        Assert.Null(bracket.Matches.Single(m => m.Id == semi.Id).WinnerTeamId);
        var request = new RecordTournamentSetRequest(21, 17, bracket.Version);
        bracket = await service.RecordSetAsync(1, semi.Id, 2, request, 1, true);
        var version = bracket.Version;
        bracket = await service.RecordSetAsync(1, semi.Id, 2, request, 1, true);
        Assert.Equal(version, bracket.Version);
        var final = bracket.Matches.Single(m => m.RoundNumber == 2);
        Assert.Equal(semi.Team1Id, final.Team2Id);
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordSetAsync(1, semi.Id, 1, new(10, 21, version), 1, true));
        bracket = await service.RecordSetAsync(1, final.Id, 1, new(21, 18, bracket.Version), 1, true);
        bracket = await service.RecordSetAsync(1, final.Id, 2, new(18, 21, bracket.Version), 1, true);
        Assert.Null(bracket.ChampionTeamId);
        bracket = await service.RecordSetAsync(1, final.Id, 3, new(21, 17, bracket.Version), 1, true);
        Assert.Equal("Finished", bracket.Status);
        Assert.Equal(final.Team1Id, bracket.ChampionTeamId);
        Assert.Equal(6, notifier.Updates.Count); // generation + five sets; duplicate did not broadcast
        Assert.Equal(5, await db.Set<TournamentMatchSet>().CountAsync());
    }

    [Fact]
    public async Task Unauthorized_staff_stale_scores_invalid_scores_and_unresolved_matches_are_rejected()
    {
        using var db = await CreateDbAsync(4);
        using var uow = new UnitOfWork(db);
        var service = new TournamentBracketService(uow, new Recorder());
        await Assert.ThrowsAsync<ForbiddenException>(() => service.GenerateAsync(1, 99, false));
        var bracket = await service.GenerateAsync(1, 1, false);
        var match = bracket.Matches.First();
        var final = bracket.Matches.Last();
        await Assert.ThrowsAsync<ForbiddenException>(() => service.RecordSetAsync(1, match.Id, 1, new(21, 10, bracket.Version), 99, false));
        await Assert.ThrowsAsync<ValidationException>(() => service.RecordSetAsync(1, match.Id, 1, new(21, 21, bracket.Version), 1, true));
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordSetAsync(1, final.Id, 1, new(21, 10, bracket.Version), 1, true));
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordSetAsync(1, match.Id, 2, new(21, 10, bracket.Version), 1, true));
        await service.RecordSetAsync(1, match.Id, 1, new(21, 10, bracket.Version), 1, true);
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordSetAsync(1, match.Id, 2, new(21, 10, bracket.Version), 1, true));
    }

    [Fact]
    public async Task Unpaid_and_disqualified_teams_are_excluded_and_insufficient_entrants_fail()
    {
        using var db = await CreateDbAsync(4);
        using var uow = new UnitOfWork(db);
        var teams = await db.TournamentTeams.OrderBy(t => t.Id).ToListAsync();
        teams[2].Status = "Registered";
        teams[3].Status = "Disqualified";
        await db.SaveChangesAsync();
        var service = new TournamentBracketService(uow, new Recorder());
        var bracket = await service.GenerateAsync(1, 1, true);
        Assert.Single(bracket.Matches);
        Assert.Equal(new[] { teams[0].Id, teams[1].Id }, new[] { bracket.Matches[0].Team1Id!.Value, bracket.Matches[0].Team2Id!.Value });
    }

    [Theory]
    [InlineData(1, "SingleElimination", "OpenReg")]
    [InlineData(4, "RoundRobin", "OpenReg")]
    [InlineData(4, "SingleElimination", "Finished")]
    public async Task Invalid_generation_is_rejected(int teams, string type, string status)
    {
        using var db = await CreateDbAsync(teams);
        using var uow = new UnitOfWork(db);
        var tournament = await db.Tournaments.SingleAsync();
        tournament.TournamentType = type;
        tournament.Status = status;
        await db.SaveChangesAsync();
        var service = new TournamentBracketService(uow, new Recorder());
        await Assert.ThrowsAnyAsync<DomainException>(() => service.GenerateAsync(1, 1, true));
        Assert.Empty(db.TournamentMatches);
    }

    private static async Task<SportHubDbContext> CreateDbAsync(int count)
    {
        var db = new SportHubDbContext(new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
        var facility = new Facility { Id = 1, Name = "Facility" };
        var user = new User { Id = 1, FullName = "Referee", StaffProfile = new StaffProfile { ManagedFacility = facility } };
        db.Tournaments.Add(new Tournament
        {
            Id = 1, Name = "Cup", Status = "OpenReg", TournamentType = "SingleElimination",
            Facility = facility, CreatedByStaff = user, Sport = new Sport { SportCode = "BAD", SportName = "Badminton" },
            Teams = Enumerable.Range(1, count).Select(id => new TournamentTeam { Id = id, TeamName = $"Team {id}", Status = "Approved" }).ToList()
        });
        await db.SaveChangesAsync();
        return db;
    }

    private sealed class Recorder : ITournamentNotifier
    {
        public List<TournamentBracketDto> Updates { get; } = [];
        public Task BracketUpdatedAsync(TournamentBracketDto bracket) { Updates.Add(bracket); return Task.CompletedTask; }
    }
}
