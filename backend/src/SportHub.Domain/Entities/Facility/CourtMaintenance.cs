using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Facility;

public class CourtMaintenance : BaseEntity
{
    public int CourtId { get; set; }
    public DateOnly MaintenanceDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }

    public Court Court { get; set; } = null!;
    public Auth.User CreatedBy { get; set; } = null!;
}
