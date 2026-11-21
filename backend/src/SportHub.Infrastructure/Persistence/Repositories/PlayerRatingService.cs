using System.Data;
using Microsoft.EntityFrameworkCore;
using SportHub.Application.DTOs.Player;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;

namespace SportHub.Infrastructure.Persistence.Repositories;

/// <summary>Reads player histories; updates Elo-style rating only from verified completed tournament matches.</summary>
public sealed class PlayerRatingService(SportHubDbContext db) : IPlayerRatingService
{
    public async Task<PlayerRatingDashboardDto> GetMyDashboardAsync(int userId, CancellationToken ct = default)
    {
        var profile = await db.PlayerProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new NotFoundException("Hồ sơ người chơi", userId);
        var skills = await db.SkillRatingHistories.AsNoTracking()
            .Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Take(100).Select(x => new SkillHistoryDto(x.Id, x.OldRating, x.NewRating,
                x.Delta, x.ChangeReason, x.TournamentMatchId, x.CreatedAt)).ToListAsync(ct);
        var reputation = await db.ReputationHistories.AsNoTracking()
            .Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Take(100).Select(x => new ReputationHistoryDto(x.Id, x.ScoreDelta,
                x.Reason, x.RelatedBookingId, x.CreatedAt)).ToListAsync(ct);
        return new PlayerRatingDashboardDto(profile.UserId, profile.NumericSkillRating,
            profile.SkillLevel, profile.TotalMatchesPlayed, profile.ReputationScore,
            profile.TotalNoShows, skills, reputation);
    }

    public async Task<MatchRatingResultDto> ApplyTournamentMatchAsync(int matchId, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var match = await db.TournamentMatches.AsNoTracking().FirstOrDefaultAsync(m => m.Id == matchId, ct)
            ?? throw new NotFoundException("Trận đấu", matchId);
        if (match.Status != "Completed" || match.Team1Id is null || match.Team2Id is null ||
            match.Team1Id == match.Team2Id || match.WinnerTeamId is null ||
            (match.WinnerTeamId != match.Team1Id && match.WinnerTeamId != match.Team2Id))
            throw new ConflictException("Chỉ tính điểm cho trận đã hoàn tất, có hai đội và đội thắng hợp lệ.");

        var teamIds = new[] { match.Team1Id.Value, match.Team2Id.Value };
        var athletes = await db.TournamentAthletes.AsNoTracking()
            .Where(a => teamIds.Contains(a.TeamId) && a.Team.TournamentId == match.TournamentId)
            .Select(a => new { a.TeamId, a.UserId }).ToListAsync(ct);
        var team1Ids = athletes.Where(x => x.TeamId == match.Team1Id).Select(x => x.UserId).Distinct().ToArray();
        var team2Ids = athletes.Where(x => x.TeamId == match.Team2Id).Select(x => x.UserId).Distinct().ToArray();
        if (team1Ids.Length == 0 || team2Ids.Length == 0 ||
            athletes.Count != team1Ids.Length + team2Ids.Length ||
            team1Ids.Intersect(team2Ids).Any())
            throw new ConflictException("Danh sách vận động viên của hai đội chưa hợp lệ.");

        var userIds = team1Ids.Concat(team2Ids).ToArray();
        var profiles = await db.PlayerProfiles.Where(p => userIds.Contains(p.UserId)).ToListAsync(ct);
        if (profiles.Count != userIds.Length)
            throw new ConflictException("Một hoặc nhiều vận động viên chưa có hồ sơ người chơi.");

        // A completed match can contribute a rating change at most once per athlete.
        if (await db.SkillRatingHistories.AnyAsync(h => h.TournamentMatchId == matchId, ct))
            throw new ConflictException("Trận đấu đã được tính điểm. Không được tính lại.");

        var map = profiles.ToDictionary(p => p.UserId);
        var avg1 = team1Ids.Average(id => map[id].NumericSkillRating);
        var avg2 = team2Ids.Average(id => map[id].NumericSkillRating);
        var changes = new List<MatchRatingChangeDto>();
        foreach (var id in userIds)
        {
            var profile = map[id];
            var onTeam1 = team1Ids.Contains(id);
            var won = (onTeam1 ? match.Team1Id : match.Team2Id) == match.WinnerTeamId;
            var old = profile.NumericSkillRating;
            var updated = SkillRatingPolicy.Calculate(old, onTeam1 ? avg2 : avg1, won);
            profile.NumericSkillRating = updated;
            profile.SkillLevel = SkillRatingPolicy.Level(updated);
            profile.TotalMatchesPlayed++;
            db.SkillRatingHistories.Add(new SkillRatingHistory
            {
                UserId = id, OldRating = old, NewRating = updated, Delta = updated - old,
                TournamentMatchId = matchId,
                ChangeReason = $"Tournament match #{matchId}: {(won ? "Win" : "Loss")}",
                CreatedAt = DateTime.UtcNow
            });
            changes.Add(new MatchRatingChangeDto(id, old, updated, updated - old, profile.SkillLevel));
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new MatchRatingResultDto(matchId, changes);
    }
}
