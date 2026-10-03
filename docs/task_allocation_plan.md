# Kế hoạch Phân chia Công việc & Tiến độ chi tiết từng tuần 📅

Dự án kéo dài 10 tuần, với 5 thành viên (Mỗi thành viên làm Full-stack cho module của mình). 
**Tuần 1 và Tuần 2 đã hoàn tất** (Bao gồm phân tích thiết kế và khởi tạo Base Project). Kế hoạch dưới đây đi chi tiết theo từng tuần từ Tuần 3 đến Tuần 10.

---

## 👥 Phân chia Module (Cố định suốt dự án)
- **Dev 1 (Leader):** Đặt sân (Booking), Tính toán tiền, Background Jobs.
- **Dev 2:** Tài khoản, Hồ sơ (Profiles), Phân quyền & Thông báo.
- **Dev 3:** Cơ sở vật chất (Facility, Court), Bảng giá động (Dynamic Pricing).
- **Dev 4:** Ghép kèo (Match-making), Điểm Uy Tín (Reputation).
- **Dev 5:** Thanh toán (Payment), Lễ tân Check-in, Thống kê Dashboard.

---

## ⏳ LỘ TRÌNH THỰC THI CHI TIẾT THEO TUẦN (Tuần 3 ➡️ Tuần 10)

### 🚀 Tuần 3: Khởi động - Dựng API & CRUD cơ bản (Backend Focus)
Mục tiêu: Đảm bảo tất cả các bảng Database đều có API để Đọc/Ghi dữ liệu.
- **Dev 1:** Khởi tạo API Tạo Booking, Tạo BookingDetail (Chưa cần check logic trùng sân phức tạp, chỉ test Insert DB).
- **Dev 2:** Viết API CRUD cho `StaffProfile`, API cập nhật `PlayerProfile`.
- **Dev 3:** Viết API Thêm/Sửa/Xóa Cơ sở (Facility), Thêm Sân (Court).
- **Dev 4:** Viết API Tạo phòng ghép kèo (`MatchRoom`), Lấy danh sách phòng.
- **Dev 5:** Viết API ghi nhận Lịch sử Check-in. Setup sườn Layout (Sidebar, Header) cho trang Admin bằng React.

### 🎨 Tuần 4: Lên khung Giao diện (Frontend Focus)
Mục tiêu: Trực quan hóa các API tuần trước lên giao diện React (Dùng Tailwind).
- **Dev 1:** Dựng UI Khách hàng chọn ngày, xem danh sách khung giờ (Timeline).
- **Dev 2:** Dựng UI Admin quản lý danh sách Nhân sự, UI cập nhật Profile cho Khách.
- **Dev 3:** Dựng UI Admin danh sách Cơ sở & Sân bãi.
- **Dev 4:** Dựng UI Bảng tin ghép kèo (Có thanh tìm kiếm, filter theo môn).
- **Dev 5:** Dựng UI Màn hình Lễ tân (Danh sách khách đến đặt sân trong ngày hôm nay).

### 🧠 Tuần 5: Xử lý Logic Phức Tạp (Core Logic) - Giai đoạn 1
Mục tiêu: Bắt đầu ghép các logic nghiệp vụ khó, liên kết các module với nhau.
- **Dev 1:** Viết thuật toán check trùng sân trong Transaction (UnitOfWork). Quăng lỗi `ConflictException` nếu sân đã có người đặt.
- **Dev 2:** Xử lý chặn Route (Auth Guard) ở Frontend, ẩn/hiện menu Navbar dựa trên Role.
- **Dev 3:** Thiết kế Database & API cho Bảng Giá (`PricePolicy`, `TimeSlot`). Viết hàm tính giá tiền linh hoạt theo giờ vàng.
- **Dev 4:** Logic Join/Leave phòng ghép kèo. Check điều kiện (Điểm uy tín >= 60 mới được tham gia).
- **Dev 5:** Viết API lưu trữ giao dịch Thanh toán (Mock Payment / Mã QR).

### ⚙️ Tuần 6: Xử lý Logic Phức Tạp (Core Logic) - Giai đoạn 2
- **Dev 1:** Code Background Job `HoldSlotExpiryJob` (Chạy ngầm cứ mỗi phút tự xóa các Booking chưa thanh toán quá 10 phút). Ráp UI Giỏ hàng.
- **Dev 2:** Thiết kế hệ thống Sinh Thông Báo (`UserNotification`) khi tài khoản có biến động.
- **Dev 3:** Dựng UI cho Admin cấu hình giá tiền theo giờ/ngày.
- **Dev 4:** Code Background Job `NoShowScannerJob` (Quét khách đặt mà không đến) ➡️ Trừ điểm uy tín.
- **Dev 5:** Viết API Query dữ liệu thống kê doanh thu (Theo tháng, cơ sở) gom nhóm lại trả về JSON cho Admin.

### ⚡ Tuần 7: Cập nhật Thời gian thực (SignalR & Integration)
Mục tiêu: Giúp hệ thống "sống động" hơn bằng WebSockets.
- **Dev 1 & Dev 5:** Cấu hình SignalR `CourtStatusHub`. Khi Dev 1 đặt sân xong, ngay lập tức đẩy tín hiệu về màn hình Lễ tân của Dev 5 mà không cần F5 (Tải lại trang).
- **Dev 2:** Tích hợp SignalR Push Notification. Khách hàng nhận được Toast Notification màu xanh góc màn hình khi phòng ghép kèo đủ người.
- **Dev 3:** Hoàn thiện API và UI tính năng "Bảo trì sân" (Khóa sân không cho khách đặt).
- **Dev 4:** UI xem Lịch sử biến động điểm Uy tín của Player.

### 🧪 Tuần 8: Hoàn thiện tính năng & Đánh giá chéo
- **Dev 1:** Chạy thử toàn bộ luồng END-TO-END: *Đăng nhập -> Chọn sân -> Thanh toán -> Lễ tân Check-in*.
- **Dev 2:** Rà soát lại tất cả các màn hình hiển thị lỗi (Catch Error từ Axios) để hiển thị thân thiện với người dùng.
- **Dev 3:** Test chéo xem Booking của Dev 1 có đang lấy đúng Bảng giá (Giờ vàng/cuối tuần) của Dev 3 không.
- **Dev 4:** Test logic phạt điểm khi rời phòng ghép kèo sát giờ.
- **Dev 5:** Vẽ biểu đồ hình cột/tròn (Dùng thư viện `recharts`) trên Admin Dashboard dựa trên API tuần 6.

### 🐛 Tuần 9: Code Freeze (Đóng băng code) & Bug Fixing
- **Bắt buộc:** TUYỆT ĐỐI KHÔNG thêm tính năng mới trong tuần này.
- **Cả team:** Săn lỗi (Bug hunting). Bấm thử các trường hợp dị (VD: Đặt sân ở quá khứ, nhập số âm...).
- Tinh chỉnh CSS (Tailwind): Đảm bảo giao diện không bị vỡ trên màn hình điện thoại (Responsive).
- **Leader (Dev 1):** Review code toàn bộ, dọn dẹp các branch Git thừa, giải quyết xung đột (Merge Conflict) để chốt nhánh `main`.

### 🚢 Tuần 10: Triển khai (Deployment) & Tổng kết
- **Dev 1 & Dev 2:** Viết `Dockerfile`, Deploy Backend + CSDL SQL Server lên Cloud / VPS nội bộ.
- **Dev 3 & Dev 4:** Deploy Frontend lên Vercel / Render.
- **Dev 5:** Tạo Script (Seed Data) nhập dữ liệu mẫu vào DB: Tạo sẵn 3 Chi nhánh, 20 sân, 50 User giả, 100 giao dịch để làm Demo cho đẹp.
- **Cả team:** Quay video Demo tính năng, soạn Slide PowerPoint. Sẵn sàng lên thớt bảo vệ Đồ án! 🎉
