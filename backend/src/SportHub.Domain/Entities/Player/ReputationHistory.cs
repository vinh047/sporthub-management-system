using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Player;

public class ReputationHistory : BaseEntity
{
    public int UserId { get; set; }
    public int ScoreDelta { get; set; }         // Dương = tăng, âm = giảm
    public string Reason { get; set; } = string.Empty;
    public int? RelatedBookingId { get; set; }

    public Auth.User User { get; set; } = null!;
    public Booking.Booking? RelatedBooking { get; set; }
}
