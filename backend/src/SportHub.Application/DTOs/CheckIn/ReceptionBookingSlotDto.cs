namespace SportHub.Application.DTOs.CheckIn;

public record ReceptionBookingSlotDto(
    int BookingDetailId,
    int CourtId,
    string CourtName,
    string SportName,
    DateOnly PlayDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    decimal SlotPrice,
    bool CheckedIn,
    int? CheckInLogId,
    DateTime? CheckInAt,
    string? CheckInChannel,
    string? CheckedInByStaffName
);
