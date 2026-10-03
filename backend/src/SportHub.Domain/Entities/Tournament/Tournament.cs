namespace SportHub.Domain.Entities.Tournament;

public class Tournament
{
    public int Id { get; set; }
    public int FacilityId { get; set; }
    public int SportId { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>SingleElimination, RoundRobin</summary>
    public string TournamentType { get; set; } = "SingleElimination";
    public DateTime RegistrationDeadline { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int MaxTeams { get; set; }
    public decimal EntryFee { get; set; } = 0;
    public string? PrizeDescription { get; set; }
    /// <summary>Draft, OpenReg, DrawCompleted, InProgress, Finished</summary>
    public string Status { get; set; } = "Draft";
    public int CreatedByStaffId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Facility.Facility Facility { get; set; } = null!;
    public Facility.Sport Sport { get; set; } = null!;
    public Auth.User CreatedByStaff { get; set; } = null!;
    public ICollection<TournamentTeam> Teams { get; set; } = [];
    public ICollection<TournamentMatch> Matches { get; set; } = [];
}
