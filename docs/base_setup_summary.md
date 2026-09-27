# Tổng hợp Base Project - SportHub Management System 🚀

Tài liệu này liệt kê chi tiết toàn bộ các thành phần đã được khởi tạo và cấu hình trong dự án Base. Code base đã ở trạng thái **Sẵn sàng để code logic (Ready-to-code)** cho toàn bộ 5 thành viên của team.

---

## 1. BACKEND (.NET 10) 🛠️
Kiến trúc sử dụng là **Layered Architecture** (Clean Architecture pattern) chia làm 4 dự án riêng biệt để đảm bảo không bị conflict khi làm việc nhóm.

### 1.1. Tầng Domain (`SportHub.Domain`)
Tầng cốt lõi nhất, không phụ thuộc vào bất kỳ thư viện nào.
- **Base Components:** 
  - `BaseEntity`: Class cơ sở tự động track `CreatedAt`, `UpdatedAt`.
  - `DomainEnums`: Chứa toàn bộ Enum của hệ thống (Role, BookingStatus, MatchRoomStatus...).
  - `DomainExceptions`: Các Exception tuỳ chỉnh (`NotFoundException`, `ConflictException`...) dùng để ném lỗi ở tầng Service.
- **30 Entities (Bảng CSDL):** Đã phân hoạch rõ ràng thành các nhóm:
  - `Auth`: User, Role, UserRole, Permission, RolePermission, StaffProfile, StaffPermissionOverride.
  - `Facility`: Facility, Sport, Court, CourtMaintenance.
  - `Pricing`: TimeSlot, PricePolicy, PriceRuleDetail.
  - `Booking`: Booking, BookingDetail, CheckInLog, BookingCancellation.
  - `Payment`: PaymentMethod, PaymentTransaction.
  - `Matching`: MatchRoom, MatchMember, MatchMemberLeaveLog.
  - `System & Other`: NotificationTemplate, UserNotification, PlayerProfile, ReputationHistory...

### 1.2. Tầng Application (`SportHub.Application`)
Chứa Business Logic, DTOs và định nghĩa Interfaces.
- **Cấu trúc Response chuẩn:** `BaseResponse<T>` đảm bảo tất cả API trả về chung 1 format (Code, Message, Data, Errors).
- **Interfaces:** 
  - `IUnitOfWork` & `IRepository<T>`: Giao tiếp với Database.
  - `IService`: Định nghĩa hợp đồng cho các service.
- **DTOs:** Đã tạo toàn bộ các file Request/Response model cho Auth, Booking, Facility, MatchRoom, Report.
- **Services (Logic):** 
  - Đã code hoàn thiện logic thật cho `AuthService` (Hash mật khẩu, Register, Login).
  - Đã tạo *Stub (Khung)* cho toàn bộ các Service còn lại (`BookingService`, `FacilityService`...). Các Dev khác chỉ việc vào xoá `throw new NotImplementedException()` và code logic thật.
- **Dependency Injection:** File `DependencyInjection.cs` tự động quét và đăng ký Services.

### 1.3. Tầng Infrastructure (`SportHub.Infrastructure`)
Chứa code giao tiếp với công nghệ bên ngoài (DB, Auth provider).
- **Entity Framework Core (SQL Server):** 
  - `SportHubDbContext` khai báo đầy đủ 30 `DbSet`.
  - Có các file Configuration (Fluent API) để map khoá chính, khoá ngoại, index (VD: `UserConfiguration`, `BookingConfiguration`).
- **Repositories & UoW:** Triển khai logic cho `IUnitOfWork` và các repository.
- **Identity (JWT):** `JwtTokenProvider` mã hoá và giải mã JWT token.
- **Background Jobs (Workers):** Đã dựng sẵn class kế thừa `BackgroundService` cho:
  - `HoldSlotExpiryJob`: Tự động quét và huỷ các slot hết hạn giữ chỗ sau 10 phút.
  - `NoShowScannerJob`: Quét khách hàng không check-in để trừ điểm uy tín.

### 1.4. Tầng API (`SportHub.API`)
Tầng tiếp nhận Request từ người dùng.
- **Controllers:** Đã tạo đầy đủ các file Controller (`AuthController`, `BookingController`, `FacilityController`...) kèm theo Attributes bảo mật (`[Authorize(Roles="ADMIN")]`).
- **Global Exception Middleware:** Tự động bắt mọi lỗi (ví dụ Dev ném `NotFoundException` ở Service) và chuyển nó thành Http Status Code `404` trả về định dạng `BaseResponse`. Dev không cần viết `try/catch` trong Controller.
- **SignalR (Real-time):** 
  - `NotificationHub`: Gửi thông báo đến từng cá nhân (đã gắn Auth).
  - `CourtStatusHub`: Broadcast trạng thái sân (có khách vừa đặt) cho toàn bộ user đang xem chi nhánh đó.
- **OpenAPI:** Tích hợp bộ OpenAPI native mới nhất của .NET 10.
- **CORS & Logging:** Cấu hình cho phép Frontend truy cập, tích hợp thư viện ghi log `Serilog`.

---

## 2. FRONTEND (React 18 + Vite + TypeScript) 🎨

### 2.1. Cấu hình cốt lõi
- Khởi tạo bằng Vite cực nhanh, sử dụng TypeScript hoàn toàn.
- Cài đặt đầy đủ các thư viện thiết yếu: `react-router-dom`, `axios`, `zustand`, `react-hot-toast`, `recharts`, `date-fns`, `@microsoft/signalr`.

### 2.2. Base Source Code
- **API (Axios Interceptors):** File `axiosInstance.ts` đã được setup để tự động đọc JWT token từ Store gắn vào Header của mọi request. Đồng thời tự động phát hiện lỗi `401` để logout người dùng.
- **State Management (Zustand):** File `authStore.ts` lưu trạng thái user đang đăng nhập và tự động đồng bộ (persist) xuống `localStorage`.
- **Real-time Hooks:** 
  - `useSignalR`: Tự động kết nối với Server khi user login, hiện Toast Notification khi có thông báo mới.
  - `useCourtStatus`: Lắng nghe thay đổi trạng thái sân để render lại giao diện ngay lập tức.
- **Bảo mật Route (Auth Guard):** Component `<ProtectedRoute />` tự động kiểm tra xem người dùng có đăng nhập và có đúng Role (`ADMIN`, `STAFF`, `PLAYER`) hay không. Nếu sai sẽ đá về trang Login.
- **Routing:** Đã config `App.tsx` định tuyến cho cả 4 luồng người dùng: Public, Player, Staff, Admin.
- **Giao diện (CSS):** File `index.css` thiết lập sẵn các biến màu sắc (Tokens), Typography, hỗ trợ sẵn Light/Dark mode, kèm các class tiện ích làm nút bấm (Premium Button) và hiệu ứng kính (Glassmorphism).

---

## 3. CÁC TÀI LIỆU (DOCS) 📚
- **README.md:** Đã được khởi tạo tại thư mục gốc chứa hướng dẫn setup database, hướng dẫn chạy backend/frontend.
- Tích hợp tài liệu SRS hiện có của team làm căn cứ tham chiếu.
- Base code hiện tại đã phân bổ rõ ràng cấu trúc để **5 members** có thể chia nhau làm 5 modules khác nhau mà không sợ conflict Git.
