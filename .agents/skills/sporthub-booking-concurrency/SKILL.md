---
name: sporthub-booking-concurrency
description: "Quy chuẩn nghiệp vụ Core Booking, giữ chỗ HoldSlot 10 phút, kiểm tra 4 tầng xung đột, chống Race Condition, Background Jobs và phát sóng SignalR cho SportHub"
---

# Quy Chuẩn Core Booking & Concurrency Engine (Dev 1 Lead)

Áp dụng skill này khi triển khai hoặc chỉnh sửa các tính năng liên quan đến Booking, kiểm tra slot trống, giữ slot, hủy sân, xác nhận đơn và background jobs.

## 1. Vòng Đời Trạng Thái Booking (Slot State Machine)

```
[Khách chọn slot trống]
          │
          ▼ (POST /api/booking/hold)
     ┌─────────┐   Hết 10 phút + 2 phút grace    ┌───────────┐
     │  Held   │ ───────────────────────────────>│ Cancelled │ (Job tự động nhả sân)
     └─────────┘                                 └───────────┘
          │
          ▼ (POST /api/booking/{id}/confirm - Webhook/Staff)
   ┌─────────────┐   Quá giờ đá + 30 phút & chưa check-in   ┌───────────┐
   │  Confirmed  │ ────────────────────────────────────────>│  NoShow   │ (-20 điểm uy tín)
   └─────────────┘                                          └───────────┘
          │
          ├─────────────────────────────────────────────────> [Completed] (Sau giờ kết thúc)
          │
          ▼ (Khách hoặc Admin bấm Hủy)
     [Cancelled]  (Áp dụng chính sách hoàn cọc: >24h 100%, 6-24h 50%, <6h 0%)
```

## 2. Kiểm Tra 4 Tầng Xung Đột (`IsSlotAvailableAsync`)

Trước khi cho phép giữ slot, bắt buộc kiểm tra 4 điều kiện:
1. **Booking Details**: Không có đơn nào ở trạng thái `Held` (chưa hết hạn) hoặc `Confirmed` trong cùng `(CourtId, PlayDate, TimeSlotId)`.
2. **Court Maintenance**: Sân không nằm trong lịch bảo trì tại ngày thi đấu (`CourtMaintenances`).
3. **Social Session**: Không có buổi giao lưu (`SocialSessionCourts`) đang mở (`Published` hoặc `InProgress`) giao thoa khung giờ (`StartTime < slot.EndTime && EndTime > slot.StartTime`).
4. **Tournament**: Sân không bị khóa để tổ chức giải đấu trong khung giờ đó.

## 3. Chống Race Condition Khi Giữ Chỗ (`HoldSlotAsync`)

- **Bắt buộc dùng Database Transaction**:
  ```csharp
  await uow.BeginTransactionAsync();
  try
  {
      var available = await uow.Bookings.IsSlotAvailableAsync(courtId, playDate, slotId);
      if (!available)
          throw new ConflictException("Khung giờ này vừa được người khác giữ chỗ. Vui lòng chọn khung giờ khác.");

      // Tính giá -> Tạo Booking (Status = Held, HoldExpiresAt = DateTime.UtcNow.AddMinutes(10))
      // Thêm BookingDetail -> SaveChangesAsync()
      await uow.CommitTransactionAsync();
      
      // Bắn SignalR CourtStatusHub cập nhật màu sân "Held"
  }
  catch
  {
      await uow.RollbackTransactionAsync();
      throw;
  }
  ```

## 4. Background Jobs

1. **`HoldSlotExpiryJob` (Phụ trách chính: TV1 — Chạy định kỳ mỗi 60 giây)**:
   - Quét các đơn `BookingStatus.Held` có `HoldExpiresAt < DateTime.UtcNow.AddMinutes(-2)` (cộng 2 phút grace period).
   - Đổi trạng thái thành `Cancelled`.
   - Bắn sự kiện SignalR `CourtSlotUpdated` nhả ô sân về `Available`.

2. **`NoShowScannerJob` (Phụ trách chính: TV4 — Chạy định kỳ mỗi 5 phút)**:
   - Quét các đơn `Confirmed` mà đã quá giờ bắt đầu trận đấu 30 phút nhưng chưa có bản ghi `CheckInLog`.
   - Đổi trạng thái booking thành `NoShow`.
   - Gọi `IReputationService.AddDeltaAsync(userId, -20, "Vắng mặt không check-in (No-Show)")`.
