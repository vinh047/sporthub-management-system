namespace SportHub.Domain.Entities.Social;

public class SocialSessionCourt
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public int CourtId { get; set; }

    // Navigation
    public SocialSession Session { get; set; } = null!;
    public Facility.Court Court { get; set; } = null!;
}
