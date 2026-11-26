namespace SportHub.Application.DTOs.CheckIn;

public record CheckInHistoryItemDto(
    int CheckInLogId,
    int BookingDetailId,
    int BookingId,
    string BookingCode,
    string CustomerName,
    string? Phone,
    string CourtName,
    DateOnly PlayDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Channel,
    DateTime CheckInAt,
    string StaffName,
    string BookingStatus
);
