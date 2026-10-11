namespace SportHub.Domain.Enums;

public enum PaymentStatus
{
    Pending,    // Chờ xác nhận
    Confirmed,  // Đã xác nhận
    Failed,     // Thất bại
    Refunded    // Đã hoàn tiền
}
