using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Booking;

public class Booking : BaseEntity
{
    public string BookingCode { get; set; } = string.Empty;
    public int? UserId { get; set; }                // null nếu là Guest
    public string? GuestName { get; set; }           // Khách vãng lai
    public string? GuestPhone { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime? HoldExpiresAt { get; set; }    // Hết hạn giữ chỗ
    public BookingStatus BookingStatus { get; set; } = BookingStatus.Held;
    public int? CreatedByStaffId { get; set; }      // null nếu tự đặt online

    public Auth.User? User { get; set; }
    public Auth.User? CreatedByStaff { get; set; }
    public ICollection<BookingDetail> Details { get; set; } = [];
    public ICollection<Payment.PaymentTransaction> PaymentTransactions { get; set; } = [];
    public BookingCancellation? Cancellation { get; set; }
}
