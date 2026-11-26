using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Booking;

public class BookingCancellation : BaseEntity
{
    public int BookingId { get; set; }
    public int CancelledByUserId { get; set; }
    public DateTime CancelledAt { get; set; } = DateTime.UtcNow;
    public string CancelReason { get; set; } = string.Empty;
    public decimal RefundPercent { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal PenaltyAmount { get; set; }
    public RefundStatus RefundStatus { get; set; } = RefundStatus.NotRequired;
    public string? RefundFailureReason { get; set; }

    public Booking Booking { get; set; } = null!;
    public Auth.User CancelledByUser { get; set; } = null!;
}
