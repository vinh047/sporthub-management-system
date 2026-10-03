namespace SportHub.Domain.Entities.Tournament;

public class TournamentAthlete
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public int UserId { get; set; }
    public bool IsCaptain { get; set; } = false;

    // Navigation
    public TournamentTeam Team { get; set; } = null!;
    public Auth.User User { get; set; } = null!;
}
