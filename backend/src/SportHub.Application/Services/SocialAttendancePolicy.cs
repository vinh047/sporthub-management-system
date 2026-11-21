using SportHub.Domain.Entities.Social;

namespace SportHub.Application.Services;

public static class SocialAttendancePolicy
{
    // Proposed window: 30 minutes before start until scheduled end (Vietnam UTC+7).
    public static readonly TimeSpan EarlyCheckIn = TimeSpan.FromMinutes(30);
    public const int NoShowPenalty = 20;
    public static DateTime OpensUtc(SocialSession s) => SocialTicketPolicy.StartsUtc(s) - EarlyCheckIn;
    public static DateTime ClosesUtc(SocialSession s) => DateTime.SpecifyKind(
        s.PlayDate.ToDateTime(s.EndTime).AddHours(-7), DateTimeKind.Utc);
    public static bool CanCheckIn(SocialSession s, string status, DateTime now) =>
        status == "Confirmed" && (s.Status is "Published" or "InProgress") &&
        now >= OpensUtc(s) && now < ClosesUtc(s);
    public static bool IsNoShow(SocialSession s, string status, DateTime now) =>
        status == "Confirmed" && (s.Status is "Published" or "InProgress" or "Completed") &&
        now >= ClosesUtc(s);
    public static int PenalizedScore(int score) => Math.Max(0, score - NoShowPenalty);
}
