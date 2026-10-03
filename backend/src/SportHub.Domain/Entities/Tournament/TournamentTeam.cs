namespace SportHub.Domain.Entities.Tournament;

public class TournamentTeam
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int? SeedNumber { get; set; }
    /// <summary>Registered, Approved, Disqualified</summary>
    public string Status { get; set; } = "Approved";
    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tournament Tournament { get; set; } = null!;
    public ICollection<TournamentAthlete> Athletes { get; set; } = [];
}
