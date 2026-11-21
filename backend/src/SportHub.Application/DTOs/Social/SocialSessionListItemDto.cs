namespace SportHub.Application.DTOs.Social;

public class SocialSessionListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int FacilityId { get; set; }
    public int SportId { get; set; }
    public DateOnly PlayDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int MaxParticipants { get; set; }
    public int RegisteredCount { get; set; }
    public decimal FeePerSlot { get; set; }
    public decimal MinSkill { get; set; }
    public decimal MaxSkill { get; set; }
    public string Status { get; set; } = string.Empty;
    public int HeldCount { get; set; }
    public int AvailableSlots => Math.Max(0, MaxParticipants - RegisteredCount - HeldCount);
    public string? Description { get; set; }
    public List<int> CourtIds { get; set; } = [];
}
