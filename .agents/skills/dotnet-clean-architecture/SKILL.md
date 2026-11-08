---
name: dotnet-clean-architecture
description: "Quy chuẩn kiến trúc Clean Architecture, cấu trúc thư mục, DI và coding convention cho toàn bộ backend SportHub .NET 10"
---

# Hướng Dẫn Kiến Trúc Clean Architecture Cho SportHub (.NET 10)

Áp dụng skill này khi tạo mới, tái cấu trúc hoặc chỉnh sửa bất kỳ class, controller, service, repository hay entity nào trong backend SportHub.

## 1. Cấu Trúc Phân Tầng

1. **`SportHub.Domain` (Core Business)**
   - Chứa `Entities/`, `Enums/`, `Exceptions/`, `Common/BaseEntity.cs`.
   - Tuyệt đối KHÔNG tham chiếu bất kỳ tầng nào khác. Không phụ thuộc ASP.NET Core hay EF Core ngoài các annotation cơ bản nếu cần.
   - Mỗi entity, enum, exception phải nằm riêng trong 1 file `.cs`.

2. **`SportHub.Application` (Business Logic & Use Cases)**
   - Chứa `DTOs/`, `Interfaces/Repositories/`, `Interfaces/Services/`, `Services/`.
   - Tham chiếu tới `SportHub.Domain`.
   - Dùng Primary Constructor: `public class FacilityService(IUnitOfWork uow) : IFacilityService`.
   - Luôn ném Domain Exceptions (`NotFoundException`, `ConflictException`, `ValidationException`) thay vì trả về null không rõ ràng.

3. **`SportHub.Infrastructure` (Data Access & External Services)**
   - Chứa `Persistence/` (DbContext, Configurations, Repositories), `BackgroundJobs/`, `Identity/`.
   - Tham chiếu `SportHub.Application` và `SportHub.Domain`.
   - Base `Repository<T>` quản lý CRUD cơ bản, các Repository chuyên biệt kế thừa và mở rộng thêm truy vấn nghiệp vụ.
   - Fix triệt để warning CS9107: Expose `protected readonly SportHubDbContext _context = context;` trong base repository.

4. **`SportHub.API` (Presentation & Transport)**
   - Chứa `Controllers/`, `Hubs/`, `Extensions/`, `Middlewares/`.
   - Controller kế thừa `ApiControllerBase`.
   - Tổ chức cấu hình `Program.cs` gọn gàng thông qua các Extension methods (`SwaggerExtensions`, `AuthenticationExtensions`, `CorsExtensions`, `ValidationExtensions`).

## 2. Tiêu Chuẩn File & Naming

- **1 File = 1 Class / Interface / Enum**. Cấm tuyệt đối gom nhiều class vào một file như `Services.cs`.
- Tên file = Tên symbol: `BookingService.cs`, `IBookingService.cs`, `BookingStatus.cs`.
- File-scoped namespace: `namespace SportHub.Application.Services;`
- Luôn kiểm tra biên dịch không lỗi cảnh báo: `dotnet build backend/SportHub.slnx`.
