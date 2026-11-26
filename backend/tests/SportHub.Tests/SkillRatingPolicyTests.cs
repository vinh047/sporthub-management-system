using SportHub.Application.Services;

namespace SportHub.Tests;

public class SkillRatingPolicyTests
{
    [Fact]
    public void EqualRatingWinnerGainsAndLoserLoses()
    {
        Assert.Equal(2.58m, SkillRatingPolicy.Calculate(2.50m, 2.50m, true));
        Assert.Equal(2.42m, SkillRatingPolicy.Calculate(2.50m, 2.50m, false));
    }
    [Fact]
    public void RatingCannotExceedScale()
    {
        Assert.InRange(SkillRatingPolicy.Calculate(5m, 1m, true), 1m, 5m);
        Assert.InRange(SkillRatingPolicy.Calculate(1m, 5m, false), 1m, 5m);
    }
    [Fact]
    public void UnderdogWinsMorePointsThanFavourite()
    {
        var underdog = SkillRatingPolicy.Calculate(2m, 4m, true) - 2m;
        var favourite = SkillRatingPolicy.Calculate(4m, 2m, true) - 4m;
        Assert.True(underdog > favourite);
    }
    [Theory]
    [InlineData(1.0, "Beginner")]
    [InlineData(2.0, "Intermediate")]
    [InlineData(3.5, "Advanced")]
    [InlineData(4.5, "Pro")]
    public void LevelBoundaries(double value, string expected) =>
        Assert.Equal(expected, SkillRatingPolicy.Level((decimal)value));
}
