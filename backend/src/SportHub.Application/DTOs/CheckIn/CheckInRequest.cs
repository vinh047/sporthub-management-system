namespace SportHub.Application.DTOs.CheckIn;

public record CheckInRequest(
    int BookingDetailId,
    string Channel          // Phone, QRCode, Manual
);
