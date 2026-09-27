using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Facility;

public class Court : BaseEntity
{
    public int FacilityId { get; set; }
    public int SportId { get; set; }
    public string CourtName { get; set; } = string.Empty;
    public CourtType CourtType { get; set; }
    public bool IsActive { get; set; } = true;

    public Facility Facility { get; set; } = null!;
    public Sport Sport { get; set; } = null!;
    public ICollection<CourtMaintenance> Maintenances { get; set; } = [];
    public ICollection<Booking.BookingDetail> BookingDetails { get; set; } = [];
}
