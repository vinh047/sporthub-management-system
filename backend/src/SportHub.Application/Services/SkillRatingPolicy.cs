namespace SportHub.Application.Services;

/// <summary>
/// Simple Elo-style heuristic on the existing 1.00..5.00 skill scale.
/// This is not a trained ML model or an official DUPR calculation.
/// Team average is used for expected win probability; K = 0.16.
/// </summary>
public static class SkillRatingPolicy
{
    public const decimal Minimum = 1.00m;
    public const decimal Maximum = 5.00m;
    public const decimal KFactor = 0.16m;

    public static decimal Calculate(decimal ownRating, decimal opponentTeamAverage, bool won)
    {
        ownRating = Math.Clamp(ownRating, Minimum, Maximum);
        opponentTeamAverage = Math.Clamp(opponentTeamAverage, Minimum, Maximum);
        var expected = 1d / (1d + Math.Pow(10d, (double)(opponentTeamAverage - ownRating)));
        var delta = KFactor * ((won ? 1m : 0m) - (decimal)expected);
        return Math.Clamp(Math.Round(ownRating + delta, 2, MidpointRounding.AwayFromZero), Minimum, Maximum);
    }

    public static string Level(decimal rating) => rating switch
    {
        < 2.00m => "Beginner",
        < 3.50m => "Intermediate",
        < 4.50m => "Advanced",
        _ => "Pro"
    };
}
