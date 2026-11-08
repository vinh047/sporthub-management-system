---
name: sporthub-matchmaking-engine
description: "Quy chuẩn nghiệp vụ Ghép trận, Phòng giao lưu, Đánh giá trình độ (SkillLevel) và Hệ thống Uy tín (Reputation) cho SportHub"
---

# Quy Chuẩn Ghép Trận & Hệ Thống Uy Tín (MatchRoom & Reputation)

Áp dụng skill này khi phát triển `MatchRoomService`, `ReputationService`, `SocialSession` và quản lý người tham gia giao lưu.

## 1. Vòng Đời Phòng Ghép Trận (`MatchRoom` & `SocialSession`)

- **Trạng thái phòng**: `Open` (Mở nhận người) ➔ `Locked` (Đã đủ người/khóa nhận) ➔ `Completed` (Đã thi đấu xong) ➔ `Cancelled` (Hủy phòng).
- **Quy tắc tham gia (Join Room)**:
  - Kiểm tra trình độ người chơi (`SkillLevel`: Beginner, Intermediate, Advanced, SemiPro) phải nằm trong khoảng cho phép của phòng.
  - Kiểm tra điểm uy tín: Người chơi có `ReputationScore < 60` bị giới hạn tạo phòng; `< 40` bị tạm khóa tính năng ghép trận.
  - Chống race condition khi số chỗ còn lại = 1 và 2 người cùng bấm Join đồng thời (dùng Transaction hoặc Atomic check).

## 2. Luật Rút Lui & Phạt Điểm Uy Tín

- **Rút lui hợp lệ (> 2 giờ trước giờ bắt đầu)**: Cho phép rời phòng không trừ điểm uy tín.
- **Rút lui sát giờ (< 2 giờ trước giờ bắt đầu)**:
  - Bị trừ **-10 điểm uy tín**.
  - Lưu bản ghi vào `ReputationHistory`.
- **Chủ phòng hủy phòng**:
  - Hủy > 4 giờ: Không phạt.
  - Hủy < 4 giờ: Phạt chủ phòng **-15 điểm uy tín**.

## 3. Cộng Điểm Uy Tín Thưởng

- Hoàn thành trận đấu hợp lệ (có check-in): **+2 điểm uy tín**.
- Được các người chơi khác đánh giá tích cực (Vote MVP/Fair-play): **+1 điểm uy tín**.
