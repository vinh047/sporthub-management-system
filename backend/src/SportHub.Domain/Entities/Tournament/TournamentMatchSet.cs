namespace SportHub.Domain.Entities.Tournament;

public class TournamentMatchSet
{
    public int MatchId { get; set; }
    public int SetNumber { get; set; }
    public int Team1Points { get; set; }
    public int Team2Points { get; set; }
    public int RecordedByUserId { get; set; }
    public DateTime RecordedAt { get; set; }
    public TournamentMatch Match { get; set; } = null!;
}
