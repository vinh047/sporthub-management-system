namespace SportHub.Domain.Enums;

public enum RoomStatus
{
    Open,       // Đang tìm người
    Full,       // Đã đủ người
    Closed,     // Host đóng hoặc hủy
    Expired     // Quá deadline
}
