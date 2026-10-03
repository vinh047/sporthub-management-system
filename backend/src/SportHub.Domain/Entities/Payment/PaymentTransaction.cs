using SportHub.Domain.Common;
using SportHub.Domain.Enums;

namespace SportHub.Domain.Entities.Payment;

public class PaymentTransaction : BaseEntity
{
    public int? BookingId { get; set; }             // null nếu là thanh toán Social/Tournament
    public int? SocialParticipantId { get; set; }   // FK khi thanh toán vé Social
    public int? TournamentTeamId { get; set; }       // FK khi thanh toán lệ phí Giải đấu
    public int PaymentMethodId { get; set; }
    public decimal Amount { get; set; }
    public string? ReferenceCode { get; set; }      // Mã tham chiếu bank / QR
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime? ProcessedAt { get; set; }
    public int? StaffVerifierId { get; set; }        // Staff xác nhận thanh toán

    public Booking.Booking? Booking { get; set; }
    public Social.SocialParticipant? SocialParticipant { get; set; }
    public Tournament.TournamentTeam? TournamentTeam { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = null!;
    public Auth.User? StaffVerifier { get; set; }
}
