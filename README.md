# SportHub Management System 🏸

Hệ thống quản lý chuỗi sân thể thao đa chi nhánh với kiến trúc **Layered Monolith (Clean Architecture)**.

## 🚀 Giới thiệu
 Mục tiêu là số hóa việc quản lý và đặt sân thể thao, cung cấp trải nghiệm cho:
- **Người chơi (Player):** Đặt sân, giữ chỗ (hold slot) 10 phút, tìm người ghép kèo, đánh giá uy tín.
- **Nhân viên (Staff):** Check-in (Quét QR hoặc số điện thoại), quản lý trạng thái sân real-time, đặt sân hộ khách vãng lai.
- **Quản lý (Admin):** Quản lý chuỗi cơ sở, thiết lập giá động (Dynamic Pricing), xem báo cáo doanh thu.

## 🛠️ Công nghệ sử dụng
### Backend (.NET 10)
- **Kiến trúc:** Layered (API -> Application -> Domain, Infrastructure -> Domain).
- **ORM:** Entity Framework Core (SQL Server).
- **Authentication:** JWT Bearer Token.
- **Real-time:** SignalR (Broadcast trạng thái sân, Push Notification).
- **Tài liệu API:** OpenAPI (Built-in .NET 10).

### Frontend (React 18 + Vite)
- **Ngôn ngữ:** TypeScript.
- **Router:** React Router v6.
- **State Management:** Zustand (có persist localStorage).
- **HTTP Client:** Axios (Interceptors xử lý JWT).
- **Real-time:** `@microsoft/signalr`.
- **CSS:** Vanilla CSS (CSS Variables cho Dark/Light mode và thiết kế Premium).

## 📂 Cấu trúc dự án
Dự án đã được phân rã thành các layer rõ ràng để các thành viên dễ dàng làm việc song song mà không bị conflict:

```text
sporthub-management-system/
├── backend/
│   ├── src/
│   │   ├── SportHub.Domain/         (Core Entities, Enums, Exceptions) - ĐÃ XONG
│   │   ├── SportHub.Application/    (DTOs, Services, Interfaces) - ĐÃ XONG BASE
│   │   ├── SportHub.Infrastructure/ (EF Core, JWT, SignalR, BackgroundJobs) - ĐÃ XONG BASE
│   │   └── SportHub.API/            (Controllers, Middleware, OpenAPI) - ĐÃ XONG BASE
│   └── SportHub.sln
├── frontend/
│   ├── src/
│   │   ├── api/                     (Axios instance, API services)
│   │   ├── hooks/                   (SignalR hooks)
│   │   ├── store/                   (Zustand stores)
│   │   ├── utils/                   (AuthGuard)
│   │   ├── App.tsx                  (Router chính)
│   │   └── index.css                (CSS Base Tokens)
│   └── package.json
└── docs/
    └── srs.md
```

## ⚙️ Hướng dẫn cài đặt & Chạy dự án

### 1. Database (SQL Server LocalDB)
Dự án mặc định dùng `(localdb)\mssqllocaldb`. Nếu bạn chưa có, vui lòng cài đặt qua Visual Studio Installer.
```bash
cd backend
dotnet ef migrations add InitialCreate --project src/SportHub.Infrastructure --startup-project src/SportHub.API
dotnet ef database update --project src/SportHub.Infrastructure --startup-project src/SportHub.API
```

### 2. Chạy Backend
```bash
cd backend/src/SportHub.API
dotnet run
```
API Docs (OpenAPI): `http://localhost:5000/openapi/v1.json`

### 3. Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```
Truy cập: `http://localhost:5173`

## 👥 Phân công công việc (10 Tuần)
Base code đã được thiết lập bởi **Leader**. Team sẽ bắt đầu implement logic từ Tuần 3 theo `base_project_plan.md` ở thư mục Artifacts:
1. **Leader (Dev 1):** Booking core, Hold Slot, Background Jobs.
2. **Dev 2:** Auth, Staff Check-in, Manage Staff Profiles.
3. **Dev 3:** Facility, Court Management, Dynamic Pricing.
4. **Dev 4:** Match-making (Ghép kèo), Cập nhật điểm uy tín.
5. **Dev 5:** Frontend Admin Dashboard, Báo cáo thống kê.

---
*Happy Coding!* 🚀
