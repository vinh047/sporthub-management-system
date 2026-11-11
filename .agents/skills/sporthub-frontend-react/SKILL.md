---
name: sporthub-frontend-react
description: "Quy chuẩn phát triển giao diện người dùng React 18, TypeScript, bảng ma trận lịch sân CourtTimeGrid, đồng hồ đếm ngược và tích hợp SignalR"
---

# Quy Chuẩn Phát Triển Giao Diện Frontend (Dev 4 & Dev 5)

Áp dụng skill này khi phát triển các màn hình giao diện (Player Portal, Staff POS, Admin Dashboard) và các components tương tác trong SportHub.

## 1. Bảng Ma Trận Lịch Sân (`CourtTimeGrid`)

- **Bố cục giao diện**:
  - Hàng đầu tiên: Danh sách khung giờ từ 06:00 đến 22:00.
  - Các hàng tiếp theo: Mỗi hàng đại diện cho 1 sân (`Court`).
  - Thanh bộ lọc trên cùng: Chọn cơ sở (`Facility`), chọn môn thể thao (`Sport`), chọn ngày (`PlayDate`).
- **Mã màu trạng thái ô sân**:
  - 🟢 **Available (Trống)**: Màu xanh lá (`#22c55e` / `bg-green-100`). Cho phép click để đặt sân.
  - 🟡 **Held (Đang giữ chỗ)**: Màu vàng (`#eab308` / `bg-yellow-300`). Không click được, tooltip: "Đang giữ chỗ".
  - 🔴 **Confirmed (Đã đặt)**: Màu đỏ (`#ef4444` / `bg-red-400`). Không click được, tooltip: "Đã đặt".
  - 🟣 **Social (Giao lưu)**: Màu tím (`#a855f7` / `bg-purple-300`). Không click được hoặc click để xem chi tiết phòng ghép.
  - ⚫ **Maintenance (Bảo trì)**: Màu xám (`#9ca3af` / `bg-gray-400`). Không click được.

## 2. Modal Đặt Sân & Đồng Hồ Đếm Ngược (`HoldCountdownTimer`)

- Khi gọi `POST /api/booking/hold` thành công:
  - Mở `BookingModal` hiển thị thông tin sân, đơn giá, mã QR chuyển khoản giả lập.
  - Kích hoạt `HoldCountdownTimer` đếm ngược từ 10 phút (tính theo `holdExpiresAt` từ server).
  - Định dạng hiển thị: `mm:ss` (ví dụ `09:45`).
  - Khi đếm về `00:00`: Tự động đóng modal, hiển thị thông báo hết hạn và reload trạng thái ô sân.

## 3. Tích Hợp SignalR Client

- Kết nối tới endpoint `/hubs/court-status`.
- Tự động gọi `JoinFacilityGroup(facilityId, date)` khi mount component và `LeaveFacilityGroup(facilityId, date)` khi unmount hoặc đổi ngày.
- Lắng nghe event `CourtSlotUpdated` để cập nhật state cục bộ của ô sân tức thời mà không cần reload toàn bộ trang.
