namespace SportHub.Application.DTOs.Pos;

public record PosBookingResponse(
    int BookingId,
    string BookingCode,
    decimal TotalAmount
);
