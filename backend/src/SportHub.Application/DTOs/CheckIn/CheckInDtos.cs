namespace SportHub.Application.DTOs.CheckIn;

public record CheckInRequest(
    int BookingDetailId,
    string Channel          // Phone, QRCode, Manual
);

public record CheckInItem(
    int BookingDetailId,
    string BookingCode,
    string CustomerName,
    string? Phone,
    string CourtName,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string BookingStatus,
    bool CheckedIn,
    DateTime? CheckedInAt
);
