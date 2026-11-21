namespace SportHub.Application.DTOs.Player;

public sealed record SkillHistoryDto(int Id, decimal OldRating, decimal NewRating,
    decimal Delta, string ChangeReason, int? TournamentMatchId, DateTime CreatedAt);

public sealed record ReputationHistoryDto(int Id, int ScoreDelta, string Reason,
    int? RelatedBookingId, DateTime CreatedAt);

public sealed record PlayerRatingDashboardDto(int UserId, decimal NumericSkillRating,
    string SkillLevel, int TotalMatchesPlayed, int ReputationScore, int TotalNoShows,
    IReadOnlyList<SkillHistoryDto> SkillHistory, IReadOnlyList<ReputationHistoryDto> ReputationHistory);

public sealed record MatchRatingChangeDto(int UserId, decimal OldRating, decimal NewRating,
    decimal Delta, string SkillLevel);

public sealed record MatchRatingResultDto(int MatchId, IReadOnlyList<MatchRatingChangeDto> Changes);
