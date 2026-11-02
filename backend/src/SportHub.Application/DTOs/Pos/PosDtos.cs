namespace SportHub.Application.DTOs.Pos;

public record PosBookingRequest(
    int CourtId,
    DateOnly PlayDate,
    List<int> TimeSlotIds,
    string GuestName,
    string GuestPhone,
    int PaymentMethodId     // 1 = Tiền mặt, 2 = Chuyển khoản (theo dữ liệu seed)
);

public record PosBookingResponse(
    int BookingId,
    string BookingCode,
    decimal TotalAmount
);
