using SportHub.Application.Services;
using SportHub.Domain.Entities.Social;

namespace SportHub.Tests;

public class SocialAttendancePolicyTests
{
    private static SocialSession Session(string status = "Published") => new()
    { PlayDate = new DateOnly(2026, 11, 28), StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(10, 0), Status = status };
    [Fact]
    public void CheckInWindowUsesVietnamTime()
    {
        var s = Session();
        var opens = new DateTime(2026, 11, 28, 0, 30, 0, DateTimeKind.Utc);
        var closes = new DateTime(2026, 11, 28, 3, 0, 0, DateTimeKind.Utc);
        Assert.Equal(opens, SocialAttendancePolicy.OpensUtc(s));
        Assert.Equal(closes, SocialAttendancePolicy.ClosesUtc(s));
        Assert.False(SocialAttendancePolicy.CanCheckIn(s, "Confirmed", opens.AddSeconds(-1)));
        Assert.True(SocialAttendancePolicy.CanCheckIn(s, "Confirmed", opens));
        Assert.False(SocialAttendancePolicy.CanCheckIn(s, "Confirmed", closes));
        Assert.False(SocialAttendancePolicy.IsNoShow(s, "Confirmed", closes.AddSeconds(-1)));
        Assert.True(SocialAttendancePolicy.IsNoShow(s, "Confirmed", closes));
    }
    [Theory]
    [InlineData("CheckedIn")]
    [InlineData("PendingPayment")]
    [InlineData("Cancelled")]
    [InlineData("NoShow")]
    public void OtherTicketStatesAreNotPenalized(string status)
    {
        var s = Session();
        Assert.False(SocialAttendancePolicy.CanCheckIn(s, status, SocialAttendancePolicy.OpensUtc(s)));
        Assert.False(SocialAttendancePolicy.IsNoShow(s, status, SocialAttendancePolicy.ClosesUtc(s)));
    }
    [Fact]
    public void CancelledSessionIsNotPenalized()
    {
        var s = Session("Cancelled");
        Assert.False(SocialAttendancePolicy.IsNoShow(s, "Confirmed", SocialAttendancePolicy.ClosesUtc(s)));
        Assert.False(SocialAttendancePolicy.CanCheckIn(s, "Confirmed", SocialAttendancePolicy.OpensUtc(s)));
    }
    [Theory]
    [InlineData(100,80)]
    [InlineData(60,40)]
    [InlineData(10,0)]
    [InlineData(0,0)]
    public void PenaltyHasZeroFloor(int previous, int expected) => Assert.Equal(expected, SocialAttendancePolicy.PenalizedScore(previous));
}
