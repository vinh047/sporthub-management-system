using SportHub.Application.Services;
using SportHub.Domain.Entities.Social;

namespace SportHub.Tests;

/// <summary>Week 8 pure-policy tests; no database writes and no external services.</summary>
public class SocialTicketPolicyRegressionTests
{
    private static SocialSession Session() => new()
    {
        PlayDate = new DateOnly(2026, 11, 28),
        StartTime = new TimeOnly(8, 0),
        EndTime = new TimeOnly(10, 0),
        Status = "Published"
    };

    [Fact]
    public void StartTimeIsConvertedFromVietnamLocalTimeToUtc()
    {
        Assert.Equal(new DateTime(2026, 11, 28, 1, 0, 0, DateTimeKind.Utc),
            SocialTicketPolicy.StartsUtc(Session()));
    }

    [Fact]
    public void HoldIsValidBeforeExpiryButNotAtExpiry()
    {
        var registered = new DateTime(2026, 11, 20, 8, 0, 0, DateTimeKind.Utc);
        var participant = new SocialParticipant { Status = "PendingPayment", RegisteredAt = registered };
        var expiry = registered.AddMinutes(10);

        Assert.Equal(expiry, SocialTicketPolicy.ExpiresUtc(participant));
        Assert.True(SocialTicketPolicy.IsLiveHold(participant, expiry.AddTicks(-1)));
        Assert.False(SocialTicketPolicy.IsLiveHold(participant, expiry));
    }

    [Theory]
    [InlineData("Confirmed", true)]
    [InlineData("CheckedIn", true)]
    [InlineData("Cancelled", false)]
    [InlineData("NoShow", false)]
    [InlineData("PendingPayment", true)]
    public void OnlyEligibleStatusesOccupySlot(string status, bool expected)
    {
        var now = new DateTime(2026, 11, 20, 8, 1, 0, DateTimeKind.Utc);
        var participant = new SocialParticipant { Status = status, RegisteredAt = now.AddMinutes(-1) };
        Assert.Equal(expected, SocialTicketPolicy.OccupiesSlot(participant, now));
    }

    [Fact]
    public void ExpiredPendingPaymentDoesNotOccupySlot()
    {
        var now = new DateTime(2026, 11, 20, 8, 0, 0, DateTimeKind.Utc);
        var participant = new SocialParticipant { Status = "PendingPayment", RegisteredAt = now.AddMinutes(-10) };
        Assert.False(SocialTicketPolicy.OccupiesSlot(participant, now));
    }

    [Fact]
    public void CancellationSixHoursBeforeStartIsEarlyButOneTickLaterIsNot()
    {
        var starts = SocialTicketPolicy.StartsUtc(Session());
        Assert.True(SocialTicketPolicy.EarlyCancellation(Session(), starts.AddHours(-6)));
        Assert.False(SocialTicketPolicy.EarlyCancellation(Session(), starts.AddHours(-6).AddTicks(1)));
    }
}
