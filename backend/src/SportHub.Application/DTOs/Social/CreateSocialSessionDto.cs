
using System.ComponentModel.DataAnnotations;

namespace SportHub.Application.DTOs.Social;

public class CreateSocialSessionDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int FacilityId { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int SportId { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public DateOnly PlayDate { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    [Range(1, 1000)]
    public int MaxParticipants { get; set; }

    [Range(typeof(decimal), "0", "999999999")]
    public decimal FeePerSlot { get; set; }

    [Range(typeof(decimal), "1", "5")]
    public decimal MinSkill { get; set; } = 1m;

    [Range(typeof(decimal), "1", "5")]
    public decimal MaxSkill { get; set; } = 5m;

    public string? Description { get; set; }

    [Required]
    [MinLength(1)]
    public List<int> CourtIds { get; set; } = [];
}
