using SportHub.Application.DTOs.Social;
using SportHub.Application.Services;
using SportHub.Domain.Entities.Social;

namespace SportHub.Tests;

public class SocialWeek8BoundaryTests
{
    private static SocialSession Session(string status = "Published") => new()
    {
        PlayDate = new DateOnly(2026, 11, 28), StartTime = new TimeOnly(8, 0),
        EndTime = new TimeOnly(10, 0), Status = status
    };

    [Theory]
    [InlineData(12, 5, 2, 5)]
    [InlineData(12, 12, 0, 0)]
    [InlineData(12, 14, 1, 0)]
    [InlineData(0, 0, 0, 0)]
    public void AvailableSlotsNeverNegative(int capacity, int confirmed, int held, int expected)
    {
        var dto = new SocialSessionListItemDto
        {
            MaxParticipants = capacity, RegisteredCount = confirmed, HeldCount = held
        };
        Assert.Equal(expected, dto.AvailableSlots);
    }

    [Theory]
    [InlineData("Published", true)]
    [InlineData("InProgress", true)]
    [InlineData("Completed", false)]
    [InlineData("Cancelled", false)]
    public void CheckInRequiresAllowedSessionStatus(string status, bool allowed)
    {
        var s = Session(status);
        Assert.Equal(allowed, SocialAttendancePolicy.CanCheckIn(s, "Confirmed", SocialAttendancePolicy.OpensUtc(s)));
    }

    [Theory]
    [InlineData("Published", true)]
    [InlineData("InProgress", true)]
    [InlineData("Completed", true)]
    [InlineData("Cancelled", false)]
    public void NoShowRequiresAllowedSessionStatus(string status, bool expected)
    {
        var s = Session(status);
        Assert.Equal(expected, SocialAttendancePolicy.IsNoShow(s, "Confirmed", SocialAttendancePolicy.ClosesUtc(s)));
    }

    [Fact]
    public void NoShowPenalizedScoreHasZeroFloor()
    {
        Assert.Equal(80, SocialAttendancePolicy.PenalizedScore(100));
        Assert.Equal(0, SocialAttendancePolicy.PenalizedScore(10));
        Assert.Equal(0, SocialAttendancePolicy.PenalizedScore(0));
    }

    [Theory]
    [InlineData(1.00, "Beginner")]
    [InlineData(1.99, "Beginner")]
    [InlineData(2.00, "Intermediate")]
    [InlineData(3.49, "Intermediate")]
    [InlineData(3.50, "Advanced")]
    [InlineData(4.49, "Advanced")]
    [InlineData(4.50, "Pro")]
    [InlineData(5.00, "Pro")]
    public void SkillLevelBoundaryIsStable(double rating, string expected)
    {
        Assert.Equal(expected, SkillRatingPolicy.Level((decimal)rating));
    }

    [Fact]
    public void RatingDoesNotExceedSupportedScaleAtExtremeInputs()
    {
        foreach (var own in new[] { -100m, 1m, 2.5m, 5m, 100m })
        foreach (var opp in new[] { -100m, 1m, 2.5m, 5m, 100m })
        foreach (var won in new[] { true, false })
            Assert.InRange(SkillRatingPolicy.Calculate(own, opp, won), 1.00m, 5.00m);
    }
}
