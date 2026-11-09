using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SportHub.Application.DTOs.CheckIn;
using SportHub.Application.DTOs.Pos;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Tests;

public sealed class TournamentAndPosCheckInTests
{
    [Theory]
    [InlineData(150000, "Registered")]
    [InlineData(0, "Approved")]
    public async Task Create_tournament_and_register_team_with_athletes_succeeds(int entryFee, string expectedStatus)
    {
        var options = await CreateSeededInMemoryDbAsync();
        using var context = new SportHubDbContext(options);
        using var uow = new UnitOfWork(context);
        var tournamentService = new TournamentService(uow);

        var created = await tournamentService.CreateTournamentAsync(
            new CreateTournamentRequest(
                FacilityId: 1,
                SportId: 1,
                Name: "SportHub Summer Cup",
                TournamentType: "SingleElimination",
                RegistrationDeadline: DateTime.UtcNow.AddDays(5),
                StartDate: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
                EndDate: DateOnly.FromDateTime(DateTime.Now.AddDays(8)),
                MaxTeams: 4,
                EntryFee: entryFee,
                PrizeDescription: "Cúp vàng + 3.000.000đ",
                Status: "OpenReg"),
            staffUserId: 2,
            isAdmin: false);

        Assert.True(created.Id > 0);
        Assert.Equal("SportHub Summer Cup", created.Name);
        Assert.Equal(0, created.RegisteredTeamsCount);

        var team = await tournamentService.RegisterTeamAsync(
            created.Id,
            new RegisterTournamentTeamRequest(
                TeamName: "Phoenix Badminton",
                MemberPhones: ["0922222202"]),
            currentUserId: 5);

        Assert.Equal("Phoenix Badminton", team.TeamName);
        Assert.Equal(expectedStatus, team.Status);
        Assert.Null(team.SeedNumber);
        Assert.Equal(2, team.Athletes.Count);
        Assert.Contains(team.Athletes, a => a.UserId == 5 && a.IsCaptain);
        Assert.Contains(team.Athletes, a => a.UserId == 6 && !a.IsCaptain);

        var detail = await tournamentService.GetTournamentByIdAsync(created.Id);
        Assert.Equal(1, detail.RegisteredTeamsCount);
        Assert.Single(detail.Teams);
        Assert.Single(await tournamentService.GetMyTournamentsAsync(5));
        Assert.Single(await tournamentService.GetMyTournamentsAsync(6));
        Assert.Empty(await tournamentService.GetMyTournamentsAsync(7));
        await Assert.ThrowsAsync<ConflictException>(() => tournamentService.RegisterTeamAsync(
            created.Id, new RegisterTournamentTeamRequest("Second team", ["0922222299"]), 5));
        if (entryFee > 0)
            await Assert.ThrowsAsync<ConflictException>(() => tournamentService.UpdateTournamentStatusAsync(created.Id, "DrawCompleted", 2, false));
        await tournamentService.UpdateTournamentStatusAsync(created.Id, "Finished", 2, false);
        await Assert.ThrowsAsync<ValidationException>(() => tournamentService.RegisterTeamAsync(
            created.Id, new RegisterTournamentTeamRequest("Closed team"), 7));
    }

    [Fact]
    public async Task Register_team_rejects_duplicate_athlete_or_low_reputation_captain()
    {
        var options = await CreateSeededInMemoryDbAsync();
        using var context = new SportHubDbContext(options);
        using var uow = new UnitOfWork(context);
        var tournamentService = new TournamentService(uow);

        var tournament = await tournamentService.CreateTournamentAsync(
            new CreateTournamentRequest(
                FacilityId: 1,
                SportId: 1,
                Name: "SportHub Pro Open",
                TournamentType: "RoundRobin",
                RegistrationDeadline: DateTime.UtcNow.AddDays(3),
                StartDate: DateOnly.FromDateTime(DateTime.Now.AddDays(5)),
                EndDate: DateOnly.FromDateTime(DateTime.Now.AddDays(6)),
                MaxTeams: 8,
                EntryFee: 100_000m,
                PrizeDescription: "Giải thưởng 2.000.000đ"),
            staffUserId: 1,
            isAdmin: true);

        await tournamentService.RegisterTeamAsync(
            tournament.Id,
            new RegisterTournamentTeamRequest("Team Alpha", ["0922222202"]),
            currentUserId: 5);

        // VĐV 0922222202 đã thuộc Team Alpha -> đăng ký sang Team Beta phải báo lỗi 409 Conflict
        await Assert.ThrowsAsync<ConflictException>(() =>
            tournamentService.RegisterTeamAsync(
                tournament.Id,
                new RegisterTournamentTeamRequest("Team Beta", ["0922222202"]),
                currentUserId: 7));

        // User 10 có điểm uy tín = 50 (< 60) -> không được làm đội trưởng đăng ký giải
        await Assert.ThrowsAsync<ValidationException>(() =>
            tournamentService.RegisterTeamAsync(
                tournament.Id,
                new RegisterTournamentTeamRequest("Team Low Rep"),
                currentUserId: 10));
    }

    [Fact]
    public async Task Pos_walk_in_booking_and_check_in_history_flow_succeeds()
    {
        var options = await CreateSeededInMemoryDbAsync();
        using var context = new SportHubDbContext(options);
        using var uow = new UnitOfWork(context);
        var pricingService = new PricingService(uow);
        var posService = new PosService(uow, pricingService);
        var checkInService = new CheckInService(uow);
        var today = DateOnly.FromDateTime(DateTime.Now);

        var posBooking = await posService.CreateBookingAsync(
            new PosBookingRequest(
                CourtId: 1,
                PlayDate: today,
                TimeSlotIds: [1],
                GuestName: "Khách POS Test",
                GuestPhone: "0988111222",
                PaymentMethodId: 1),
            staffUserId: 2,
            isAdmin: false);

        Assert.True(posBooking.BookingId > 0);
        Assert.Equal(80_000m, posBooking.TotalAmount);

        var todayItems = await checkInService.GetTodayAsync(facilityId: 1, staffUserId: 2, isAdmin: false);
        var item = Assert.Single(todayItems);
        Assert.False(item.CheckedIn);

        await checkInService.CheckInAsync(
            new CheckInRequest(item.BookingDetailId, "Manual"),
            staffUserId: 2,
            isAdmin: false);

        // Check-in lần 2 trên cùng khung giờ phải ném ConflictException (409)
        await Assert.ThrowsAsync<ConflictException>(() =>
            checkInService.CheckInAsync(
                new CheckInRequest(item.BookingDetailId, "Manual"),
                staffUserId: 2,
                isAdmin: false));

        var history = await checkInService.GetHistoryAsync(facilityId: 1, playDate: today, staffUserId: 2, isAdmin: false);
        var log = Assert.Single(history);
        Assert.Equal(posBooking.BookingCode, log.BookingCode);
        Assert.Equal("Khách POS Test", log.CustomerName);
        Assert.Equal("Manual", log.Channel);
        Assert.Equal("Staff Quan 7", log.StaffName);
    }

    private static async Task<DbContextOptions<SportHubDbContext>> CreateSeededInMemoryDbAsync()
    {
        var options = new DbContextOptionsBuilder<SportHubDbContext>()
            .UseInMemoryDatabase($"tournament-pos-test-{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        using var db = new SportHubDbContext(options);

        db.Facilities.Add(new Facility
        {
            Id = 1,
            Name = "SportHub Quận 7",
            Address = "123 Nguyễn Thị Thập, Q7",
            Hotline = "0900111222",
            OpenTime = new TimeOnly(6, 0),
            CloseTime = new TimeOnly(23, 0),
            IsActive = true
        });

        db.Sports.Add(new Sport
        {
            Id = 1,
            SportCode = "BADMINTON",
            SportName = "Cầu lông",
            IsActive = true
        });

        db.Courts.Add(new Court
        {
            Id = 1,
            FacilityId = 1,
            SportId = 1,
            CourtName = "Sân CL-01",
            CourtType = CourtType.Indoor,
            IsActive = true
        });

        db.TimeSlots.Add(new TimeSlot
        {
            Id = 1,
            SlotIndex = 1,
            StartTime = new TimeOnly(6, 0),
            EndTime = new TimeOnly(7, 0),
            IsDefaultPeak = false
        });

        var policy = new PricePolicy
        {
            Id = 1,
            FacilityId = 1,
            SportId = 1,
            BasePrice = 80_000m,
            WeekendSurchargePercent = 0m,
            EffectiveFrom = new DateOnly(2025, 1, 1),
            IsActive = true
        };
        policy.PriceRuleDetails.Add(new PriceRuleDetail
        {
            Id = 1,
            PolicyId = 1,
            TimeSlotId = 1,
            HourlyRate = 80_000m,
            IsPeakHour = false
        });
        db.PricePolicies.Add(policy);

        db.PaymentMethods.Add(new PaymentMethod
        {
            Id = 1,
            MethodCode = "CASH",
            MethodName = "Tiền mặt",
            IsActive = true
        });

        db.Users.AddRange(
            new User
            {
                Id = 1,
                FullName = "Admin SportHub",
                PhoneNumber = "0900000001",
                PasswordHash = "hash",
                IsActive = true
            },
            new User
            {
                Id = 2,
                FullName = "Staff Quan 7",
                PhoneNumber = "0911111111",
                PasswordHash = "hash",
                IsActive = true,
                StaffProfile = new StaffProfile { UserId = 2, ManagedFacilityId = 1, Position = "Lễ tân" }
            },
            new User
            {
                Id = 5,
                FullName = "Pham Minh Dung",
                PhoneNumber = "0922222201",
                PasswordHash = "hash",
                IsActive = true,
                PlayerProfile = new PlayerProfile { UserId = 5, ReputationScore = 100, NumericSkillRating = 3.5m, SkillLevel = "Intermediate" }
            },
            new User
            {
                Id = 6,
                FullName = "Hoang Thi Lan",
                PhoneNumber = "0922222202",
                PasswordHash = "hash",
                IsActive = true,
                PlayerProfile = new PlayerProfile { UserId = 6, ReputationScore = 95, NumericSkillRating = 2.5m, SkillLevel = "Beginner" }
            },
            new User
            {
                Id = 7,
                FullName = "Vu Duc Khai",
                PhoneNumber = "0922222203",
                PasswordHash = "hash",
                IsActive = true,
                PlayerProfile = new PlayerProfile { UserId = 7, ReputationScore = 100, NumericSkillRating = 4.2m, SkillLevel = "Advanced" }
            },
            new User
            {
                Id = 10,
                FullName = "Low Rep Player",
                PhoneNumber = "0922222299",
                PasswordHash = "hash",
                IsActive = true,
                PlayerProfile = new PlayerProfile { UserId = 10, ReputationScore = 50, NumericSkillRating = 2.0m, SkillLevel = "Beginner" }
            });

        await db.SaveChangesAsync();
        return options;
    }
}
