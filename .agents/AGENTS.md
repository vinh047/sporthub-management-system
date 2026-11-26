# SportHub Project Rules & Conventions

Hệ thống SportHub Management System áp dụng các quy chuẩn phát triển nghiêm ngặt sau đây cho toàn bộ mã nguồn:

---

## 1. Kiến Trúc & Cấu Trúc File
- **Layered Clean Architecture**: 
  - `SportHub.Domain`: Entities, Enums, Exceptions, BaseEntity. KHÔNG phụ thuộc tầng nào khác.
  - `SportHub.Application`: DTOs, Service Interfaces, Repository Interfaces, Services logic.
  - `SportHub.Infrastructure`: EF Core DbContext, Repository implementations, Background Jobs, Identity/JWT.
  - `SportHub.API`: Controllers, SignalR Hubs, Middlewares, Extensions, Swagger.
- **Single Responsibility File Structure**:
  - TUYỆT ĐỐI KHÔNG gom gộp nhiều class, interface, enum vào 1 file chung (như `Services.cs`, `Controllers.cs`, `IRepositories.cs`).
  - Mỗi class, interface, enum, record DTO phải nằm trong một file `.cs` riêng biệt, tên file trùng khớp 100% với tên symbol (PascalCase).
- **Template Boilerplate**: Xóa bỏ hoàn toàn các file mẫu mặc định (`Class1.cs`, `WeatherForecastController.cs`, v.v.).

---

## 2. Tiêu Chuẩn C# 13 & .NET 10
- Sử dụng **File-scoped namespaces** (`namespace SportHub.Application.Services;`).
- Sử dụng **Primary Constructors** cho dependency injection (`public class BookingService(IUnitOfWork uow) : IBookingService`).
- Tránh cảnh báo biến bị capture hai lần (CS9107) khi kế thừa base class.
- Không dùng hardcoded connection strings hay credentials, cấu hình qua `appsettings.json` hoặc Environment Variables.

---

## 3. Quản Lý Dữ Liệu & EF Core
- Mọi Entity phải kế thừa `BaseEntity` (`Id`, `CreatedAt`, `UpdatedAt`).
- Repository Pattern: Sử dụng `IUnitOfWork` để quản lý transaction và commit dữ liệu tập trung.
- Truy vấn đọc (Read-only) nên dùng `.AsNoTracking()` để tối ưu hiệu năng.
- Khi cập nhật hoặc khóa ô sân, bắt buộc dùng Transaction (`BeginTransactionAsync`) để chống Race Condition.

---

## 4. API & Xử Lý Lỗi Chuẩn Hóa
- Controller kế thừa `ApiControllerBase` để lấy `CurrentUserId`, `RequiredUserId`, `CurrentUserRole`.
- Mọi phản hồi API tuân theo format chuẩn:
  - Thành công: `BaseResponse<T>.Success(data, message)` (200 OK hoặc 201 Created).
  - Lỗi: ném các Domain Exceptions tương ứng:
    - `NotFoundException` ➔ 404 Not Found
    - `ConflictException` ➔ 409 Conflict
    - `ForbiddenException` ➔ 403 Forbidden
    - `ValidationException` ➔ 400 Bad Request
    - `DomainException` ➔ 400 Bad Request

---

## 5. Quy Ước Git & Branching
- Định dạng commit theo chuẩn Conventional Commits:
  - `feat(...)`: Tính năng mới
  - `fix(...)`: Sửa lỗi
  - `refactor(...)`: Tái cấu trúc mã nguồn không thay đổi logic bên ngoài
  - `docs(...)`: Tài liệu
  - `test(...)`: Kiểm thử
- Không commit trực tiếp vào `main`. Làm việc trên branch theo chức năng hoặc thành viên (`vinh`, `feature/booking`, v.v.).
