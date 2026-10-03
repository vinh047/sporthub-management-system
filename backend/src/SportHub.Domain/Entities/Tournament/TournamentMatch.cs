namespace SportHub.Domain.Entities.Tournament;

public class TournamentMatch
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    /// <summary>1: Vòng loại, 2: Tứ kết, 3: Bán kết, 4: Chung kết</summary>
    public int RoundNumber { get; set; }
    public int MatchOrder { get; set; }
    public int? CourtId { get; set; }
    public DateTime? ScheduledStartTime { get; set; }
    public int? Team1Id { get; set; }
    public int? Team2Id { get; set; }
    public int? WinnerTeamId { get; set; }
    /// <summary>Ví dụ: 2-1 (11-9, 8-11, 11-7)</summary>
    public string? ScoreSummary { get; set; }
    /// <summary>Scheduled, InProgress, Completed, Walkover</summary>
    public string Status { get; set; } = "Scheduled";

    // Navigation
    public Tournament Tournament { get; set; } = null!;
    public Facility.Court? Court { get; set; }
    public TournamentTeam? Team1 { get; set; }
    public TournamentTeam? Team2 { get; set; }
    public TournamentTeam? WinnerTeam { get; set; }
}
