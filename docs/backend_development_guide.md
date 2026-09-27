# Hướng dẫn phát triển tính năng Backend (Clean Architecture) 🚀

Tài liệu này dùng một ví dụ thực tế: **"Thêm mới một Môn Thể Thao (Create Sport)"** để minh hoạ luồng xử lý code đi qua 4 tầng của dự án. Team có thể xem đây là mẫu (template) để triển khai bất kỳ tính năng nào khác.

---

## 🔄 Luồng xử lý tiêu chuẩn (Request Flow)
`Client (Frontend)` ➡️ `API (Controller)` ➡️ `Application (Service)` ➡️ `Infrastructure (Repository)` ➡️ `Database`

---

## 🛠️ Triển khai từng bước

### Bước 1: Tạo DTO (Data Transfer Object)
*📍 Vị trí: `SportHub.Application/DTOs/Facility/FacilityDtos.cs`*

DTO dùng để nhận dữ liệu từ Frontend và trả dữ liệu về. Tuyệt đối không dùng trực tiếp Entity (ví dụ class `Sport`) để trả về API.

```csharp
namespace SportHub.Application.DTOs.Facility;

// Data nhận từ Frontend
public class CreateSportRequest
{
    public string SportCode { get; set; } = string.Empty;
    public string SportName { get; set; } = string.Empty;
}

// Data trả về cho Frontend
public class SportResponse
{
    public int Id { get; set; }
    public string SportCode { get; set; } = string.Empty;
    public string SportName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
```

### Bước 2: Khai báo Service Interface
*📍 Vị trí: `SportHub.Application/Interfaces/Services/IServices.cs` (hoặc tạo file `IFacilityService.cs`)*

Định nghĩa hợp đồng (contract) cho tính năng.

```csharp
using SportHub.Application.DTOs.Facility;

namespace SportHub.Application.Interfaces.Services;

public interface IFacilityService
{
    // ... các hàm cũ
    Task<SportResponse> CreateSportAsync(CreateSportRequest request);
}
```

### Bước 3: Code Business Logic (Service)
*📍 Vị trí: `SportHub.Application/Services/FacilityService.cs`*

Đây là nơi chứa logic chính. Bạn sẽ dùng `IUnitOfWork` để tương tác với Database và ném ra các `DomainException` nếu có lỗi logic.

```csharp
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.DTOs.Facility;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Exceptions; // Dùng exception chuẩn

namespace SportHub.Application.Services;

public class FacilityService : IFacilityService
{
    private readonly IUnitOfWork _uow;

    public FacilityService(IUnitOfWork uow)
    {
        _uow = uow; // Tự động Inject UoW
    }

    public async Task<SportResponse> CreateSportAsync(CreateSportRequest request)
    {
        // 1. Validation (Kiểm tra xem mã môn thể thao đã tồn tại chưa)
        var existingSports = await _uow.Sports.GetAllAsync();
        if (existingSports.Any(s => s.SportCode == request.SportCode))
        {
            // Ném lỗi Domain, GlobalMiddleware sẽ tự biến nó thành lỗi HTTP 409 Conflict
            throw new ConflictException($"Môn thể thao với mã {request.SportCode} đã tồn tại!");
        }

        // 2. Map DTO sang Entity
        var newSport = new Sport
        {
            SportCode = request.SportCode,
            SportName = request.SportName,
            IsActive = true
        };

        // 3. Lưu vào Database thông qua UnitOfWork
        await _uow.Sports.AddAsync(newSport);
        await _uow.SaveChangesAsync(); // BẮT BUỘC GỌI ĐỂ COMMIT XUỐNG DB

        // 4. Map Entity trả về Response DTO
        return new SportResponse
        {
            Id = newSport.Id,
            SportCode = newSport.SportCode,
            SportName = newSport.SportName,
            IsActive = newSport.IsActive
        };
    }
}
```

### Bước 4: Mở API Endpoint (Controller)
*📍 Vị trí: `SportHub.API/Controllers/FacilityController.cs`*

Controller chỉ làm nhiệm vụ tiếp nhận Request HTTP, gọi Service và gói kết quả vào `BaseResponse`.

```csharp
using Microsoft.AspNetCore.Mvc;
using SportHub.Application;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.DTOs.Facility;
using Microsoft.AspNetCore.Authorization;

namespace SportHub.API.Controllers;

[ApiController]
[Route("api/facilities/sports")]
public class SportController : ControllerBase
{
    private readonly IFacilityService _facilityService;

    public SportController(IFacilityService facilityService)
    {
        _facilityService = facilityService;
    }

    // Yêu cầu quyền ADMIN mới được tạo môn thể thao
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateSport([FromBody] CreateSportRequest request)
    {
        // Gọi service
        var result = await _facilityService.CreateSportAsync(request);
        
        // Trả về theo format BaseResponse chuẩn của dự án
        return Ok(BaseResponse<SportResponse>.Success(result, "Tạo môn thể thao thành công"));
    }
}
```

---

## 💡 Các tài nguyên có sẵn cần tận dụng

### 1. Xử lý Lỗi (Exception Handling)
Trong quá trình code Service, nếu thấy dữ liệu sai, **không trả về `null` hay string báo lỗi**, hãy ném thẳng `Exception`:
- `throw new NotFoundException("Không tìm thấy sân");` ➡️ Tự động trả về HTTP 404.
- `throw new ConflictException("Khung giờ đã bị đặt");` ➡️ Tự động trả về HTTP 409.
- `throw new DomainException("Số tiền không hợp lệ");` ➡️ Tự động trả về HTTP 400.
*(Middleware `GlobalExceptionHandler` ở tầng API sẽ tự lo phần còn lại).*

### 2. Giao tiếp Database (IUnitOfWork)
Đừng gọi trực tiếp DbContext. Hãy dùng `_uow`:
- Lấy Repository: `_uow.Users`, `_uow.Bookings`, `_uow.Courts`.
- Thêm mới: `await _uow.Courts.AddAsync(court)`.
- Cập nhật: Gọi thẳng sửa Entity, sau đó gọi `await _uow.SaveChangesAsync()`.
- Xoá: `await _uow.Courts.DeleteAsync(court.Id)`.

### 3. Trả về API (BaseResponse)
Mọi API (`Ok()`, `BadRequest()`) trong Controller đều phải bọc lại bằng:
- `BaseResponse<T>.Success(data, message)`
- `BaseResponse<T>.Failure(message)` 
Điều này giúp Frontend xử lý chung 1 cấu trúc JSON rất dễ dàng.

### 4. Phân quyền (Authorization)
Chỉ cần thêm Attribute lên trên hàm Controller:
- `[Authorize]` (Yêu cầu đăng nhập)
- `[Authorize(Roles = "ADMIN,STAFF")]` (Yêu cầu Role cụ thể)
- *Frontend sẽ tự động gửi JWT Token qua Axios interceptor đã setup sẵn.*
