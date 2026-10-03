# 🏸 SportHub Management System

Hệ thống quản lý chuỗi sân thể thao đa chi nhánh, bao gồm đặt sân trực tuyến, vận hành quầy POS, tổ chức buổi chơi tập thể (Social Sessions), giải đấu (Tournaments), và hệ thống tích điểm thành viên (Loyalty CRM).

---

## 🛠️ Công nghệ sử dụng

| Phần | Công nghệ |
|---|---|
| **Backend** | .NET 10 · Clean Architecture |
| **Database** | SQL Server (LocalDB khi dev) |
| **ORM** | Entity Framework Core 10 |
| **Xác thực** | JWT Bearer Token (BCrypt) |
| **Real-time** | SignalR WebSockets |
| **API Docs** | OpenAPI (Built-in .NET 10) |
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS v3 + Vanilla CSS Variables |
| **State** | Zustand (persist localStorage) |
| **HTTP** | Axios (tự động gắn JWT) |

---

## 📦 Yêu cầu cài đặt trước

Đảm bảo máy bạn đã cài đặt đầy đủ các công cụ sau:

- [**.NET 10 SDK**](https://dotnet.microsoft.com/download) → Kiểm tra: `dotnet --version`
- [**Node.js >= 20**](https://nodejs.org/) → Kiểm tra: `node --version`
- [**SQL Server LocalDB**](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/sql-server-express-localdb) (Có sẵn khi cài Visual Studio) hoặc **SQL Server Express**
- [**EF Core CLI**](https://learn.microsoft.com/en-us/ef/core/cli/dotnet) → Cài bằng lệnh:
  ```bash
  dotnet tool install --global dotnet-ef
  ```

---

## 🚀 Hướng dẫn cài đặt & Chạy lần đầu

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/vinh047/sporthub-management-system.git
cd sporthub-management-system
```

### Bước 2: Cấu hình Backend

**2.1. Cài đặt JWT Secret (BẮT BUỘC)**

Mở file `backend/src/SportHub.API/appsettings.Development.json`.
Nếu file chưa tồn tại, tạo mới với nội dung sau:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SportHubDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Secret": "DAY_LA_SECRET_KEY_CUA_BAN_THAY_BANG_CHUOI_DAI_HON_32_KY_TU",
    "Issuer": "SportHub",
    "Audience": "SportHubClient",
    "ExpiryMinutes": "60"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Debug"
    }
  }
}
```

> **⚠️ Lưu ý bảo mật:** File `appsettings.Development.json` đã có trong `.gitignore`. Mỗi thành viên tự tạo file này trên máy mình, **KHÔNG ĐƯỢC commit file này lên Git**.

**2.2. Khởi tạo Database (Chỉ chạy lần đầu tiên)**

```bash
cd backend

# Tạo Migration từ Entities (nếu chưa có)
dotnet ef migrations add InitialCreate --project src/SportHub.Infrastructure --startup-project src/SportHub.API

# Áp dụng Migration, tạo database thực tế
dotnet ef database update --project src/SportHub.Infrastructure --startup-project src/SportHub.API
```

> Sau khi chạy, database `SportHubDb` sẽ được tạo tự động trên LocalDB của máy bạn.

**2.3. Chạy Backend**

```bash
cd backend/src/SportHub.API
dotnet run
```

Khi thấy dòng `Now listening on: http://localhost:5000` là Backend đã hoạt động.

| Endpoint | URL |
|---|---|
| API Base URL | `http://localhost:5000` |
| API Documentation | `http://localhost:5000/openapi/v1.json` |

---

### Bước 3: Cài đặt & Chạy Frontend

```bash
cd frontend

# Cài đặt thư viện (chỉ cần chạy lần đầu)
npm install

# Chạy Development Server
npm run dev
```

Truy cập: **`http://localhost:5173`**

---

## 📂 Cấu trúc thư mục dự án

```text
sporthub-management-system/
├── backend/
│   └── src/
│       ├── SportHub.Domain/         # Entities (DB Tables), Enums, Domain Exceptions
│       │   └── Entities/
│       │       ├── Auth/            # User, Role, Permission, StaffProfile
│       │       ├── Booking/         # Booking, BookingDetail, CheckInLog
│       │       ├── Facility/        # Facility, Court, Sport, PricePolicy
│       │       ├── Social/          # SocialSession, SocialParticipant
│       │       ├── Tournament/      # Tournament, TournamentTeam, TournamentMatch
│       │       ├── Loyalty/         # Promotion, UserVoucher, LoyaltyHistory
│       │       ├── Player/          # PlayerProfile, ReputationHistory, SkillRatingHistory
│       │       ├── Payment/         # PaymentTransaction, PaymentMethod
│       │       └── Notifications/   # UserNotification, NotificationTemplate
│       ├── SportHub.Application/    # Business Logic: Services, DTOs, Interfaces
│       ├── SportHub.Infrastructure/ # EF Core, JWT, SignalR, Background Jobs
│       └── SportHub.API/            # Controllers, Middleware, Program.cs
├── frontend/
│   └── src/
│       ├── api/         # axiosInstance.ts, authApi.ts, bookingApi.ts, ...
│       ├── components/  # Các component dùng chung (Button, Modal, Table, ...)
│       ├── hooks/       # useSignalR.ts, useCourtStatus.ts
│       ├── pages/       # Các màn hình (LoginPage, BookingPage, AdminDashboard, ...)
│       ├── store/       # authStore.ts (Zustand)
│       ├── utils/       # authGuard.tsx (ProtectedRoute)
│       ├── App.tsx      # Cấu hình Router chính
│       └── index.css    # Design System (CSS Variables + Tailwind Directives)
└── docs/
    ├── backend_development_guide.md  # Hướng dẫn code Backend
    ├── frontend_development_guide.md # Hướng dẫn code Frontend
    ├── complex_feature_example.md    # Ví dụ chức năng đầy đủ end-to-end
    └── task_allocation_plan.md       # Kế hoạch phân chia công việc
```

---

## 👥 Phân công & Tài liệu tham khảo

| Dev | Module phụ trách | Tài liệu |
|---|---|---|
| **Dev 1 (Leader)** | Booking Core, Hold Slot, Background Jobs | [Kế hoạch chi tiết](docs/task_allocation_plan.md) |
| **Dev 2** | Auth, Staff Profiles, Notifications | [Hướng dẫn Backend](docs/backend_development_guide.md) |
| **Dev 3** | Facility, Court, Dynamic Pricing | [Hướng dẫn Backend](docs/backend_development_guide.md) |
| **Dev 4** | Social Sessions, Tournaments, AI Skill Rating | [Ví dụ End-to-End](docs/complex_feature_example.md) |
| **Dev 5** | Payment, Check-in POS, Admin Dashboard | [Hướng dẫn Frontend](docs/frontend_development_guide.md) |

---

## 🔄 Quy trình Git cho Team

```bash
# 1. Kéo code mới nhất về trước khi bắt đầu làm việc
git pull origin main

# 2. Tạo branch mới cho tính năng của bạn (KHÔNG code thẳng trên main)
git checkout -b feature/ten-tinh-nang-cua-ban

# 3. Code, commit thường xuyên với message rõ ràng
git add .
git commit -m "feat: Thêm API đặt sân cho Player"

# 4. Push branch lên và tạo Pull Request để Leader review
git push origin feature/ten-tinh-nang-cua-ban
```

> **Quy tắc quan trọng:** Chỉ Leader mới được Merge PR vào nhánh `main`.

---

## ❓ Câu hỏi thường gặp

**Q: Chạy `dotnet run` bị lỗi `Cannot open database "SportHubDb"`?**
> A: Bạn chưa chạy lệnh tạo database. Hãy chạy `dotnet ef database update` ở Bước 2.2.

**Q: Frontend báo lỗi `Network Error` khi gọi API?**
> A: Đảm bảo Backend đang chạy ở port `5000`. Kiểm tra file `frontend/src/api/axiosInstance.ts` xem `baseURL` có đang trỏ đúng `http://localhost:5000/api` không.

**Q: Cần thêm một bảng mới vào Database?**
> A: Tạo Entity mới ở `SportHub.Domain/Entities/`, đăng ký `DbSet` trong `SportHubDbContext.cs`, sau đó chạy lại `dotnet ef migrations add TenMigration` và `dotnet ef database update`.

---

*Happy Coding! 🚀 — SportHub Team*
*Happy Coding!* 🚀
Hello world1
