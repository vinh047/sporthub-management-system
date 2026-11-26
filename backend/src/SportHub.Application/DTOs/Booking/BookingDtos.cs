namespace SportHub.Application.DTOs.Booking;

// --- Requests ---

public record HoldSlotRequest(
    int CourtId,
    DateOnly PlayDate,
    int TimeSlotId,
    // Guest fields (khi Staff đặt hộ)
    string? GuestName,
    string? GuestPhone
)
{
    public List<int>? TimeSlotIds { get; init; }
}

public record CancelBookingRequest(string Reason);

// --- Responses ---

public record BookingResponse(
    int Id,
    string BookingCode,
    string Status,
    decimal TotalAmount,
    DateTime? HoldExpiresAt,
    List<BookingDetailDto> Details,
    string? PaymentStatus = null,
    string? RefundStatus = null,
    decimal? RefundAmount = null
);

public record BookingPaymentStatusResponse(
    int BookingId,
    string BookingCode,
    string BookingStatus,
    string? PaymentStatus,
    string? RefundStatus,
    decimal RefundAmount,
    string? RefundNote
);

public record BookingDetailDto(
    int Id,
    int CourtId,
    string CourtName,
    string FacilityName,
    DateOnly PlayDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    decimal SlotPrice
);

public record BookingDetailResponse(
    int Id,
    string BookingCode,
    string Status,
    decimal TotalAmount,
    string? UserName,
    string? GuestName,
    string? GuestPhone,
    List<BookingDetailDto> Details,
    List<PaymentSummary> Payments
);

public record PaymentSummary(
    int Id,
    string PaymentMethod,
    decimal Amount,
    string Status,
    DateTime? ProcessedAt
);
