namespace SportHub.Domain.Enums;

public enum BookingStatus
{
    Held,       // Giữ chỗ tạm (10 phút)
    Confirmed,  // Đã xác nhận thanh toán
    Cancelled,  // Đã hủy
    Completed   // Đã hoàn thành (sau giờ thi đấu)
}

public enum RoomStatus
{
    Open,       // Đang tìm người
    Full,       // Đã đủ người
    Closed,     // Host đóng hoặc hủy
    Expired     // Quá deadline
}

public enum MemberStatus
{
    Joined,     // Đang tham gia
    Left,       // Đã rút lui
    NoShow      // Vắng mặt, không check-in
}

public enum CheckInChannel
{
    Phone,      // Check-in bằng SĐT
    QRCode,     // Check-in bằng QR
    Manual      // Check-in thủ công bởi Staff
}

public enum PaymentStatus
{
    Pending,    // Chờ xác nhận
    Confirmed,  // Đã xác nhận
    Failed,     // Thất bại
    Refunded    // Đã hoàn tiền
}

public enum SkillLevel
{
    Beginner,
    Intermediate,
    Advanced,
    Professional
}

public enum CourtType
{
    Indoor,
    Outdoor
}
