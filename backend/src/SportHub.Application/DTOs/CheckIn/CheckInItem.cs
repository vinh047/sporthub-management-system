namespace SportHub.Application.DTOs.CheckIn;

public record CheckInItem(
    int BookingDetailId,
    int BookingId,
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
