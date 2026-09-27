# Ví dụ toàn diện: Chức năng Đặt Sân Trực Tuyến (Online Booking) 🏟️

Đây là một chức năng phức tạp, đụng chạm đến gần như toàn bộ các thành phần của hệ thống (Frontend, JWT, Middleware, Service, SignalR, và Background Job).

## 🔄 Toàn cảnh luồng xử lý (Flow)

1. **Frontend (React):** Người dùng bấm "Đặt sân", Axios tự động đính kèm JWT Token vào Header.
2. **API (Controller):** Nhận Request. Chặn người dùng nếu không có quyền `PLAYER`. Lấy `UserId` từ Token.
3. **Application (Service):**
   - Kiểm tra sân còn trống không? Nếu bị trùng ➡️ Quăng `ConflictException`.
   - Tính toán giá tiền.
   - Dùng `IUnitOfWork` tạo bản ghi `Booking` và `BookingDetail`.
4. **Middleware (API):** Đứng ngoài cùng. Nếu bắt được `ConflictException` từ bước 3, nó tự bọc thành lỗi `HTTP 409` trả về cho Client.
5. **Infrastructure (Database):** Lưu dữ liệu xuống SQL Server vật lý.
6. **SignalR (Real-time):** Sau khi lưu DB xong, bắn sự kiện cho tất cả những người đang xem sân đó biết sân đã bị đặt (để giao diện của họ tự khóa lại).
7. **Background Job:** Khởi động bộ đếm giờ (Nếu 10 phút sau khách chưa thanh toán, Job sẽ tự động xóa Booking này).

---

## 🛠️ Chi tiết triển khai

### 1. Frontend: Gọi API qua Axios
*📍 `frontend/src/pages/BookingPage.tsx`*
Axios Interceptor (`axiosInstance`) đã tự động gắn Token. Frontend chỉ cần gọi hàm POST bình thường.
```typescript
import { axiosInstance } from '../api/axiosInstance';
import toast from 'react-hot-toast';

const handleBooking = async () => {
    try {
        const response = await axiosInstance.post('/api/bookings', {
            courtId: 1,
            playDate: '2026-10-01',
            timeSlotId: 5
        });
        toast.success("Giữ chỗ thành công! Bạn có 10 phút để thanh toán.");
    } catch (error) {
        // Nếu bị Middleware trả về 409 (Trùng sân)
        toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
};
```

### 2. API Tầng: Controller & Phân quyền (Authorization)
*📍 `backend/src/SportHub.API/Controllers/BookingController.cs`*
Controller tiếp nhận, lấy ID của người đặt, và giao cho Service xử lý.
```csharp
[ApiController]
[Route("api/bookings")]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService) => _bookingService = bookingService;

    [HttpPost]
    [Authorize(Roles = "PLAYER")] // CHỈ PLAYER ĐƯỢC PHÉP ĐẶT SÂN
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        // Trích xuất UserId từ JWT Token đang đăng nhập
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userId = int.Parse(userIdString!);

        var result = await _bookingService.CreateBookingAsync(userId, request);
        
        // BaseResponse gói dữ liệu trả về chuẩn JSON
        return Ok(BaseResponse<BookingResponse>.Success(result, "Giữ chỗ thành công"));
    }
}
```

### 3. Application Tầng: Xử lý Logic & Quăng Lỗi & Gọi SignalR
*📍 `backend/src/SportHub.Application/Services/BookingService.cs`*
Đây là "trái tim" của chức năng.
```csharp
public class BookingService : IBookingService
{
    private readonly IUnitOfWork _uow;
    private readonly IHubContext<CourtStatusHub> _courtHub; // Dùng để bắn Real-time

    public BookingService(IUnitOfWork uow, IHubContext<CourtStatusHub> courtHub)
    {
        _uow = uow;
        _courtHub = courtHub;
    }

    public async Task<BookingResponse> CreateBookingAsync(int userId, CreateBookingRequest req)
    {
        // 1. Kiểm tra sân còn trống không (Sử dụng UnitOfWork)
        bool isAvailable = await _uow.Bookings.IsSlotAvailableAsync(req.CourtId, req.PlayDate, req.TimeSlotId);
        
        if (!isAvailable)
        {
            // QUĂNG LỖI! Global Exception Middleware sẽ tự "chộp" lấy lỗi này.
            throw new ConflictException("Rất tiếc, khung giờ này vừa có người đặt mất rồi!");
        }

        // 2. Tạo Booking
        var booking = new Booking
        {
            UserId = userId,
            BookingStatus = BookingStatus.Held, // Trạng thái: Đang giữ chỗ
            HoldExpiresAt = DateTime.UtcNow.AddMinutes(10), // Cho 10 phút để thanh toán
            // ... (các thuộc tính khác)
        };

        // 3. Lưu xuống Database
        await _uow.Bookings.AddAsync(booking);
        await _uow.SaveChangesAsync(); // Transaction thành công!

        // 4. Bắn SignalR (Real-time) cho toàn bộ người dùng khác
        // Báo cho mọi người biết sân này đã bị giữ chỗ để giao diện tự khóa lại (chuyển sang màu xám)
        await _courtHub.Clients.All.SendAsync("CourtSlotUpdated", new {
            CourtId = req.CourtId,
            Date = req.PlayDate,
            SlotId = req.TimeSlotId,
            Status = "Held"
        });

        return new BookingResponse { BookingId = booking.Id };
    }
}
```

### 4. API Tầng: Middleware tự động bắt lỗi
*📍 `backend/src/SportHub.API/Middleware/GlobalExceptionHandler.cs`*
Đoạn code trong Middleware này hoạt động "ngầm". Khi Service quăng `ConflictException` ở bước 3, Middleware này sẽ chặn lại và format nó trước khi bay về Frontend.
*(Bạn không cần tự code thêm đoạn này vì tôi đã code sẵn trong Base)*
```csharp
// Trích xuất từ GlobalExceptionHandler.cs (Mã Base)
public async Task Invoke(HttpContext context)
{
    try
    {
        await _next(context); // Đi tiếp vào Controller -> Service
    }
    catch (Exception ex)
    {
        // Nếu bắt được ConflictException từ Service
        if (ex is ConflictException conflictEx)
        {
            context.Response.StatusCode = 409;
            await context.Response.WriteAsJsonAsync(
                BaseResponse<object>.Failure(conflictEx.Message)
            );
        }
    }
}
```

### 5. Infrastructure Tầng: Background Job (Chạy ngầm)
*📍 `backend/src/SportHub.Infrastructure/BackgroundJobs/HoldSlotExpiryJob.cs`*
Chức năng này không kết thúc khi API trả về kết quả. Một đoạn code chạy ngầm (Cron Job) sẽ liên tục quét Database.
*(Đã có sẵn stub trong Base)*
```csharp
public class HoldSlotExpiryJob : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Cứ 1 phút quét 1 lần
            // Nếu phát hiện Booking nào trạng thái 'Held' mà DateTime.UtcNow > HoldExpiresAt
            // -> Tự động đổi trạng thái thành 'Cancelled' và nhả sân ra.
            
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

---
## 🎯 TỔNG KẾT
Như bạn thấy, nhờ kiến trúc phân tầng:
- Frontend chỉ quan tâm việc gọi API.
- Controller chỉ lo nhận Request và check Phân quyền (Roles).
- Service chỉ lo tính toán logic và ném lỗi (Throw Exception) nếu sai nghiệp vụ.
- Middleware lo việc bọc lỗi lại cho đẹp.
- SignalR & Background Job lo các luồng tương tác phụ ngoài luồng API chính.

Mỗi file chỉ làm đúng 1 nhiệm vụ. Nhờ vậy, team 5 người có thể phân nhau ra: người làm UI, người viết API Controller, người viết logic DB mà không hề cản trở nhau!
