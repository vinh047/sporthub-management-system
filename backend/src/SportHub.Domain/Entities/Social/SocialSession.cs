namespace SportHub.Domain.Entities.Social;

public class SocialSession
{
    public int Id { get; set; }
    public int FacilityId { get; set; }
    public int SportId { get; set; }
    public int CreatedByStaffId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly PlayDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int MaxParticipants { get; set; }
    public decimal FeePerSlot { get; set; } = 0;
    public decimal MinSkill { get; set; } = 1.00m;
    public decimal MaxSkill { get; set; } = 5.00m;
    /// <summary>Published, InProgress, Completed, Cancelled</summary>
    public string Status { get; set; } = "Published";
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Facility.Facility Facility { get; set; } = null!;
    public Facility.Sport Sport { get; set; } = null!;
    public Auth.User CreatedByStaff { get; set; } = null!;
    public ICollection<SocialSessionCourt> SessionCourts { get; set; } = [];
    public ICollection<SocialParticipant> Participants { get; set; } = [];
}
