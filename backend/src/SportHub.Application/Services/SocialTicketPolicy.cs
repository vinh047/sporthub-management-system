using SportHub.Domain.Entities.Social;

namespace SportHub.Application.Services;

public static class SocialTicketPolicy
{
    // Proposed local hold duration; confirm with TV5 before integration.
    public static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(10);
    public static DateTime StartsUtc(SocialSession s) => DateTime.SpecifyKind(
        s.PlayDate.ToDateTime(s.StartTime).AddHours(-7), DateTimeKind.Utc);
    public static DateTime ExpiresUtc(SocialParticipant p) => p.RegisteredAt.Add(HoldDuration);
    public static bool IsLiveHold(SocialParticipant p, DateTime now) =>
        p.Status == "PendingPayment" && ExpiresUtc(p) > now;
    public static bool OccupiesSlot(SocialParticipant p, DateTime now) =>
        p.Status is "Confirmed" or "CheckedIn" || IsLiveHold(p, now);
    public static bool EarlyCancellation(SocialSession s, DateTime now) => StartsUtc(s) - now >= TimeSpan.FromHours(6);
}
