namespace SportHub.Application.DTOs.Booking;

// --- Requests ---

public record HoldSlotRequest(
    int CourtId,
    DateOnly PlayDate,
    int TimeSlotId,
    // Guest fields (khi Staff đặt hộ)
    string? GuestName,
    string? GuestPhone
);

public record ConfirmBookingRequest(
    int PaymentMethodId,
    string? ReferenceCode   // Mã chuyển khoản / QR code
);

public record CheckInRequest(
    string PhoneNumberOrBookingCode,
    int BookingDetailId,
    string Channel          // Phone, QRCode, Manual
);

// --- Responses ---

public record BookingResponse(
    int Id,
    string BookingCode,
    string Status,
    decimal TotalAmount,
    DateTime? HoldExpiresAt,
    List<BookingDetailDto> Details
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
