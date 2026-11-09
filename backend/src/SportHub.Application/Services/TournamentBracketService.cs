using System.Data;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class TournamentBracketService(IUnitOfWork uow, ITournamentNotifier notifier) : ITournamentBracketService
{
    public async Task<TournamentBracketDto> GetAsync(int tournamentId)
        => Map(await LoadAsync(tournamentId));

    public async Task<TournamentBracketDto> GenerateAsync(int tournamentId, int userId, bool isAdmin)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        TournamentBracketDto result;
        try
        {
            var tournament = await LoadAsync(tournamentId);
            await EnsureStaffAsync(tournament, userId, isAdmin);
            if (tournament.TournamentType != "SingleElimination")
                throw new ValidationException(["Sinh nhánh chỉ áp dụng cho giải loại trực tiếp."]);
            if (tournament.Matches.Count > 0 || tournament.Status != "OpenReg")
                throw new ConflictException("Chỉ sinh nhánh một lần khi giải đang mở đăng ký và chưa có trận đấu.");
            var teams = tournament.Teams.Where(t => t.Status == "Approved")
                .OrderBy(t => t.SeedNumber ?? int.MaxValue).ThenBy(t => t.RegistrationDate).ThenBy(t => t.Id).ToList();
            // Registered/unpaid teams are not entrants; late payment cannot alter a drawn bracket.
            if (tournament.EntryFee > 0)
            {
                foreach (var waiting in tournament.Teams.Where(t => t.Status == "Registered"))
                {
                    var payment = await uow.Payments.GetLatestPaymentForTournamentTeamAsync(waiting.Id);
                    if (payment?.Status is PaymentStatus.Pending or PaymentStatus.Confirmed)
                        throw new ConflictException($"Đội '{waiting.TeamName}' có giao dịch cần xác nhận. Hãy hoàn tất đối soát trước khi sinh nhánh.");
                }
                var paidTeams = new List<TournamentTeam>();
                foreach (var team in teams)
                    if ((await uow.Payments.GetLatestPaymentForTournamentTeamAsync(team.Id))?.Status == PaymentStatus.Confirmed)
                        paidTeams.Add(team);
                teams = paidTeams;
            }
            var generated = BinaryBracketGenerator.Generate(tournament.Id, teams.Select(t => t.Id).ToList());
            for (var i = 0; i < teams.Count; i++) teams[i].SeedNumber = i + 1;
            foreach (var match in generated) tournament.Matches.Add(match);
            tournament.Status = "DrawCompleted";
            tournament.BracketVersion++;
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            result = Map(tournament);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
        await notifier.BracketUpdatedAsync(result);
        return result;
    }

    public async Task<TournamentBracketDto> RecordSetAsync(int tournamentId, int matchId, int setNumber,
        RecordTournamentSetRequest request, int userId, bool isAdmin)
    {
        if (setNumber is < 1 or > 3 || request.Team1Points is < 0 or > 999 ||
            request.Team2Points is < 0 or > 999 || request.Team1Points == request.Team2Points)
            throw new ValidationException(["Set đấu phải từ 1 đến 3, điểm từ 0 đến 999 và không được hòa."]);
        await uow.BeginTransactionAsync();
        TournamentBracketDto result;
        try
        {
            var tournament = await LoadAsync(tournamentId);
            await EnsureStaffAsync(tournament, userId, isAdmin);
            var match = tournament.Matches.SingleOrDefault(m => m.Id == matchId)
                ?? throw new NotFoundException("Trận đấu", matchId);
            var existing = match.Sets.SingleOrDefault(s => s.SetNumber == setNumber);
            // A retried identical command is safe, including after the final was settled.
            if (existing is not null && existing.Team1Points == request.Team1Points && existing.Team2Points == request.Team2Points)
            {
                await uow.CommitTransactionAsync();
                return Map(tournament);
            }
            if (tournament.BracketVersion != request.ExpectedVersion)
                throw new ConflictException("Nhánh đấu vừa thay đổi. Tải lại trước khi nhập điểm.");
            if (tournament.TournamentType != "SingleElimination" || tournament.Status is not ("DrawCompleted" or "InProgress") ||
                match.Status is "Completed" or "Walkover")
                throw new ConflictException("Trận đấu đã khóa kết quả hoặc giải không còn nhận điểm.");
            if (match.Team1Id is null || match.Team2Id is null)
                throw new ConflictException("Chưa xác định đủ hai đội cho trận đấu.");
            if (existing is not null || setNumber != match.Sets.Count + 1)
                throw new ConflictException("Nhập tuần tự từng set. Set đã xác nhận không được ghi đè.");
            match.Sets.Add(new TournamentMatchSet
            {
                MatchId = match.Id, SetNumber = setNumber,
                Team1Points = request.Team1Points, Team2Points = request.Team2Points,
                RecordedByUserId = userId, RecordedAt = DateTime.UtcNow
            });
            var firstWins = match.Sets.Count(s => s.Team1Points > s.Team2Points);
            var secondWins = match.Sets.Count - firstWins;
            match.ScoreSummary = $"{firstWins}-{secondWins} ({string.Join(", ", match.Sets.OrderBy(s => s.SetNumber).Select(s => $"{s.Team1Points}-{s.Team2Points}"))})";
            match.Status = "InProgress";
            tournament.Status = "InProgress";
            if (firstWins == 2 || secondWins == 2)
            {
                match.WinnerTeamId = firstWins == 2 ? match.Team1Id : match.Team2Id;
                match.Status = "Completed";
                BinaryBracketGenerator.Advance(tournament.Matches, match);
                if (match.RoundNumber == tournament.Matches.Max(m => m.RoundNumber))
                    tournament.Status = "Finished";
            }
            tournament.BracketVersion++;
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            result = Map(tournament);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
        await notifier.BracketUpdatedAsync(result);
        return result;
    }

    private async Task<Tournament> LoadAsync(int id)
        => await uow.Tournaments.GetWithMatchesAsync(id) ?? throw new NotFoundException("Giải đấu", id);

    private async Task EnsureStaffAsync(Tournament tournament, int userId, bool isAdmin)
    {
        if (!isAdmin && await uow.CheckIns.GetStaffFacilityIdAsync(userId) != tournament.FacilityId)
            throw new ForbiddenException("Chỉ nhân viên/trọng tài của cơ sở tổ chức được quản lý nhánh đấu.");
    }

    private static TournamentBracketDto Map(Tournament tournament)
    {
        var names = tournament.Teams.ToDictionary(t => t.Id, t => t.TeamName);
        var final = tournament.Matches.OrderByDescending(m => m.RoundNumber).FirstOrDefault();
        var champion = tournament.Status == "Finished" ? final?.WinnerTeamId : null;
        return new(tournament.Id, tournament.Name, tournament.TournamentType, tournament.Status, tournament.BracketVersion,
            3, champion, champion.HasValue ? names.GetValueOrDefault(champion.Value) : null,
            tournament.Matches.OrderBy(m => m.RoundNumber).ThenBy(m => m.MatchOrder).Select(m =>
            {
                var next = tournament.Matches.SingleOrDefault(n => n.RoundNumber == m.RoundNumber + 1 && n.MatchOrder == (m.MatchOrder + 1) / 2);
                return new BracketMatchDto(m.Id, m.RoundNumber, m.MatchOrder, m.Team1Id,
                    m.Team1Id.HasValue ? names.GetValueOrDefault(m.Team1Id.Value) : null, m.Team2Id,
                    m.Team2Id.HasValue ? names.GetValueOrDefault(m.Team2Id.Value) : null, m.WinnerTeamId,
                    m.Status, m.ScoreSummary, next?.Id, next is null ? null : m.MatchOrder % 2 == 1 ? 1 : 2,
                    m.Sets.OrderBy(s => s.SetNumber).Select(s => new TournamentSetDto(s.SetNumber, s.Team1Points, s.Team2Points)).ToList());
            }).ToList());
    }
}
