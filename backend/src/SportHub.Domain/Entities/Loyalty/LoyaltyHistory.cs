namespace SportHub.Domain.Entities.Loyalty;

public class LoyaltyHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }
    /// <summary>Dương: Tích điểm; Âm: Tiêu điểm</summary>
    public int PointsChanged { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int? RelatedBookingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Auth.User User { get; set; } = null!;
    public Booking.Booking? RelatedBooking { get; set; }
}
