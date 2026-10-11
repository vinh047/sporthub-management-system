namespace SportHub.Domain.Enums;

public enum BookingStatus
{
    Held,       // Giữ chỗ tạm (10 phút)
    Confirmed,  // Đã xác nhận thanh toán
    Cancelled,  // Đã hủy
    Completed,  // Đã hoàn thành (sau giờ thi đấu)
    NoShow      // Vắng mặt, không đến sân
}
