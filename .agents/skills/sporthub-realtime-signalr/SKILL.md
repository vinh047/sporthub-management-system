---
name: sporthub-realtime-signalr
description: "Quy chuẩn thiết kế Hubs SignalR, phát sóng sự kiện thời gian thực (CourtStatusHub, NotificationHub) và kết nối client trong SportHub"
---

# Quy Chuẩn Real-Time SignalR Hubs (Dev 1 & Dev 2)

Áp dụng skill này khi phát triển các Hubs thời gian thực, bắn sự kiện cập nhật trạng thái sân hoặc gửi thông báo tức thời tới khách hàng và nhân viên quầy POS.

## 1. Cấu Trúc SignalR Hubs

1. **`CourtStatusHub` (`/hubs/court-status`)**:
   - Quản lý trạng thái từng ô sân theo cơ sở và ngày.
   - Nhóm kết nối theo format: `facility-{facilityId}-{date:yyyy-MM-dd}`.
   - Khi client mở màn hình lịch sân ➔ Gọi `JoinFacilityGroup(facilityId, date)`.
   - Khi client chuyển ngày hoặc rời trang ➔ Gọi `LeaveFacilityGroup(facilityId, date)`.
   - **Sự kiện phát sóng**: `CourtSlotUpdated`
     ```json
     {
       "courtId": 1,
       "date": "2026-10-15",
       "timeSlotId": 3,
       "status": "Held" // "Available" | "Held" | "Confirmed" | "Social" | "Maintenance"
     }
     ```

2. **`NotificationHub` (`/hubs/notifications`)**:
   - Gửi thông báo định danh tới từng cá nhân qua `UserId`.
   - Dùng JWT Authentication với query string `access_token` để trích xuất `Context.UserIdentifier`.
   - **Sự kiện phát sóng**: `ReceiveNotification` (Nội dung thông báo, thời gian, loại thông báo).

## 2. Tiêu Chuẩn Phát Sóng Từ Service Tầng Application

- Trong `BookingService` hoặc Background Jobs, inject `IHubContext<CourtStatusHub>` để bắn sự kiện:
  ```csharp
  await hubContext.Clients
      .Group($"facility-{facilityId}-{date:yyyy-MM-dd}")
      .SendAsync("CourtSlotUpdated", new { CourtId = courtId, Date = dateStr, TimeSlotId = slotId, Status = status });
  ```
- Luôn bọc trong try-catch nhẹ hoặc log cảnh báo để tránh việc lỗi kết nối SignalR làm gãy transaction nghiệp vụ cốt lõi trong database.
