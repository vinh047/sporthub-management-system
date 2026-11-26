using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;

namespace SportHub.Infrastructure.Persistence.Repositories;

// Attendance-specific persistence: one serializable transaction protects each state change.
public class SocialAttendanceService(SportHubDbContext db, ILogger<SocialAttendanceService> logger) : ISocialAttendanceService
{
    private async Task<SocialSession> AuthorizedSessionAsync(int sessionId, int managerId, CancellationToken ct)
    {
        var manager = await db.Users.Include(u => u.UserRole).ThenInclude(r => r!.Role)
            .Include(u => u.StaffProfile).FirstOrDefaultAsync(u => u.Id == managerId, ct);
        if (manager is null || !manager.IsActive || manager.UserRole?.Role.RoleCode is not ("ADMIN" or "STAFF"))
            throw new ForbiddenException("Chỉ Admin hoặc Staff được check-in Social.");
        var session = await db.SocialSessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct)
            ?? throw new NotFoundException("Buổi Social", sessionId);
        if (manager.UserRole.Role.RoleCode != "ADMIN" && manager.StaffProfile?.ManagedFacilityId != session.FacilityId)
            throw new ForbiddenException("Bạn không có quyền quản lý cơ sở này.");
        return session;
    }

    private static SocialAttendeeDto Map(SocialParticipant p, SocialSession s, DateTime now) =>
        new(p.Id, p.UserId, p.User.FullName, p.Status, p.PaidAmount,
            SocialAttendancePolicy.CanCheckIn(s, p.Status, now));

    public async Task<SocialAttendanceDto> ListAsync(int sessionId, int managerId, CancellationToken ct = default)
    {
        var session = await AuthorizedSessionAsync(sessionId, managerId, ct);
        var people = await db.SocialParticipants.AsNoTracking().Include(p => p.User)
            .Where(p => p.SessionId == sessionId).OrderBy(p => p.User.FullName).ThenBy(p => p.Id).ToListAsync(ct);
        var now = DateTime.UtcNow;
        return new(session.Id, session.Title, SocialAttendancePolicy.OpensUtc(session),
            SocialAttendancePolicy.ClosesUtc(session), people.Select(p => Map(p, session, now)).ToList());
    }

    public async Task<SocialAttendeeDto> CheckInAsync(int sessionId, int ticketId, int managerId, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var session = await AuthorizedSessionAsync(sessionId, managerId, ct);
        var ticket = await db.SocialParticipants.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == ticketId && p.SessionId == sessionId, ct)
            ?? throw new NotFoundException("Vé Social", ticketId);
        var now = DateTime.UtcNow;
        // Replay of a successful request must not change anything.
        if (ticket.Status != "CheckedIn")
        {
            if (!SocialAttendancePolicy.CanCheckIn(session, ticket.Status, now))
                throw new ConflictException("Chỉ vé đã xác nhận trong khung giờ check-in mới được điểm danh.");
            ticket.Status = "CheckedIn";
            await db.SaveChangesAsync(ct);
        }
        await tx.CommitAsync(ct);
        return Map(ticket, session, now);
    }

    public async Task<int> ScanNoShowsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var local = now.AddHours(7);
        var date = DateOnly.FromDateTime(local);
        var time = TimeOnly.FromDateTime(local);
        // SQL-side cutoff + bounded batch. No unrelated Booking records are touched.
        var ids = await db.SocialParticipants.AsNoTracking()
            .Where(p => p.Status == "Confirmed" &&
                (p.Session.Status == "Published" || p.Session.Status == "InProgress" || p.Session.Status == "Completed") &&
                (p.Session.PlayDate < date || (p.Session.PlayDate == date && p.Session.EndTime <= time)) &&
                db.PlayerProfiles.Any(profile => profile.UserId == p.UserId))
            .OrderBy(p => p.Id).Select(p => p.Id).Take(100).ToListAsync(ct);
        var count = 0;
        foreach (var id in ids)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var ticket = await db.SocialParticipants.Include(p => p.Session).FirstOrDefaultAsync(p => p.Id == id, ct);
                if (ticket is null || !SocialAttendancePolicy.IsNoShow(ticket.Session, ticket.Status, DateTime.UtcNow))
                    continue;
                var profile = await db.PlayerProfiles.FirstOrDefaultAsync(p => p.UserId == ticket.UserId, ct);
                if (profile is null) continue;
                var old = profile.ReputationScore;
                profile.ReputationScore = SocialAttendancePolicy.PenalizedScore(old);
                profile.TotalNoShows++;
                ticket.Status = "NoShow";
                // Existing history schema only has RelatedBookingId, so retain the Social reference in Reason.
                // Add via navigation to populate existing shadow PlayerProfileUserId FK.
                profile.ReputationHistories.Add(new ReputationHistory
                {
                    UserId = ticket.UserId, ScoreDelta = profile.ReputationScore - old,
                    Reason = $"Social NoShow: buổi #{ticket.SessionId}, vé #{ticket.Id} (mức phạt 20 điểm)",
                    RelatedBookingId = null
                });
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                count++;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                // Transaction disposed without commit rolls back; next scan may retry.
                logger.LogError(ex, "Social NoShow failed for ticket {TicketId}", id);
            }
            finally { db.ChangeTracker.Clear(); }
        }
        return count;
    }
}
