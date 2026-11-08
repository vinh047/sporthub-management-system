# UC08 – Giữ Slot & Đặt Sân Trực Tuyến: Báo Cáo Kỹ Thuật

> **Ngày kiểm tra:** 2026-10-18  
> **Phạm vi:** Backend API – `SportHub.API` · `SportHub.Application` · `SportHub.Infrastructure`  
> **Tài liệu SRS:** UC08 – Giữ slot & Đặt sân trực tuyến  

---

## 1. Yêu Cầu SRS (UC08)

| ID | Yêu Cầu | Actor | Priority |
|----|---------|-------|----------|
| R1 | Hỗ trợ Player đã đăng nhập + Khách vãng lai (GuestName/Phone) | Player | MUST |
| R2 | Input: CourtId, PlayDate, TimeSlotId, PromoCode (tùy chọn) | Player | MUST |
| R3 | Kiểm tra Race Condition – 2 người cùng bấm → người chậm nhận **409 Conflict** | System | MUST |
| R4 | Tạo đơn trạng thái `Held` (SRS: `PendingPayment`), `HoldExpiresAt = UtcNow + 10 phút` | System | MUST |
| R5 | **Bắn SignalR** cập nhật slot → màu Vàng "Đang giữ chỗ" cho tất cả client | System | MUST |
| R6 | Hiển thị mã VietQR + đồng hồ đếm ngược (Frontend responsibility) | System | SHOULD |
| R7 | Sau thanh toán xác nhận → trạng thái `Confirmed`, SignalR cập nhật màu Đỏ | System | MUST |
| R8 | Lưu chi tiết vào bảng `Bookings` và `BookingDetails` | System | MUST |
| R9 | (UC09) Background Job tự động nhả slot hết hạn sau 10 phút | System | MUST |

---

## 2. Kết Quả Kiểm Tra Triển Khai

### 2.1 Tóm Tắt

| Layer | File | Trạng thái |
|-------|------|-----------|
| API Controller | `BookingController.cs` | ✅ Đúng |
| DTO / Request | `BookingDtos.cs` | ⚠️ Thiếu PromoCode |
| Service Interface | `IBookingService.cs` | ✅ Đúng |
| Service – HoldSlotAsync | `BookingService.cs` | ⚠️ Thiếu guard + transaction |
| Service – ConfirmBookingAsync | `BookingService.cs` | ❌ NotImplementedException |
| Repository – IsSlotAvailableAsync | `BookingRepository.cs` | ✅ Logic đúng (nhưng không được gọi) |
| Pricing Calculation | `PricingService.cs` | ❌ NotImplementedException |
| SignalR Broadcast | `CourtStatusHub.cs` | ⚠️ Hub tồn tại, không được gọi |
| Background Job (Expire) | `HoldSlotExpiryJob.cs` | ❌ Placeholder – không xử lý |
| Race Condition Protection | `BookingService.cs` | ❌ Thiếu hoàn toàn |

**Mức độ hoàn thành: ~45%** (4/9 requirements đầy đủ)

---

### 2.2 API Endpoints Đã Có

```
POST   /api/booking/hold            → Giữ slot (Anonymous + Authenticated)
POST   /api/booking/{id}/confirm    → Xác nhận thanh toán [Require Auth]
POST   /api/booking/{id}/cancel     → Hủy đơn [Require Auth]
GET    /api/booking/my-bookings     → Lịch sử đặt sân [Require Auth]
GET    /api/booking/{id}            → Chi tiết đơn (Public)

WebSocket: /hubs/courts  hoặc  /hubs/court-status
  ← JoinFacilityGroup(facilityId)  → nhận real-time updates
  ← LeaveFacilityGroup(facilityId)
```

---

### 2.3 Vấn Đề Nghiêm Trọng (Blocking)

#### ❌ #1 – Race Condition Không Được Bảo Vệ

`BookingService.HoldSlotAsync` **không gọi** `IsSlotAvailableAsync` trước khi tạo đơn.  
→ Hai request đồng thời cùng slot → **double booking**.

```csharp
// Cần thêm vào HoldSlotAsync:
await uow.BeginTransactionAsync();

var available = await uow.Bookings.IsSlotAvailableAsync(
    request.CourtId, request.PlayDate, request.TimeSlotId);
if (!available)
    throw new ConflictException("409: Khung giờ vừa được người khác giữ chỗ.");

// ... create booking ...
await uow.CommitTransactionAsync();
```

#### ❌ #2 – Giá Slot Hardcode 100.000đ

`PricingService.CalculateSlotPriceAsync` → `throw new NotImplementedException()`.  
Service dùng `catch (NotImplementedException) { slotPrice = 100_000m; }`.  
→ Không tính peak/off-peak, không theo bảng giá `PriceRuleDetails`.

#### ❌ #3 – HoldSlotExpiryJob Không Hoạt Động

```csharp
// Hiện tại chỉ là:
// TODO (Tuần 6): Query Bookings WHERE Status=Held AND HoldExpiresAt < UtcNow
await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
```

Slot hết hạn **không được nhả** → availability sai.

---

### 2.4 Vấn Đề Quan Trọng (Should Fix)

#### ⚠️ #4 – SignalR Không Broadcast

`CourtStatusHub` tồn tại và được mapped đúng, nhưng `BookingService` không inject `IHubContext<CourtStatusHub>`.  
→ Frontend không nhận được cập nhật real-time khi slot bị giữ.

```csharp
// Cần thêm vào BookingService (inject IHubContext<CourtStatusHub>):
await _hubContext.Clients.Group($"facility-{facilityId}")
    .SendAsync("SlotStatusChanged", new {
        courtId, playDate, timeSlotId, status = "Held"
    });
```

#### ⚠️ #5 – ConfirmBookingAsync Chưa Triển Khai

```csharp
public Task<BookingResponse> ConfirmBookingAsync(int bookingId, ConfirmBookingRequest request)
    => throw new NotImplementedException("Triển khai ở Tuần 5/6");
```

Flow thanh toán → xác nhận không hoạt động.

#### ⚠️ #6 – PromoCode Thiếu Trong Request

```csharp
// Hiện tại:
public record HoldSlotRequest(int CourtId, DateOnly PlayDate, int TimeSlotId, string? GuestName, string? GuestPhone);

// Cần thêm:
string? PromoCode  // Hỗ trợ mã giảm giá theo SRS
```

---

### 2.5 Những Gì Đã Đúng ✅

| Component | Chi tiết |
|-----------|---------|
| API Routes & HTTP Methods | REST chuẩn, đúng semantic |
| Guest Booking Validation | Yêu cầu GuestName+Phone nếu không đăng nhập |
| JWT Identity Resolution | `CurrentUserId` từ Claims chuẩn |
| Booking Entity | `BookingStatus.Held`, `HoldExpiresAt = +10m` đúng SRS |
| Persist Booking + Details | Đúng schema `Bookings` + `BookingDetails` |
| `IsSlotAvailableAsync` | Logic 3 tầng: Booking conflict · Maintenance · SocialSession |
| MapToResponse / Detail | Đầy đủ thông tin sân, giờ, payment |
| SignalR Hub Scaffold | JoinFacilityGroup / LeaveFacilityGroup đúng pattern |
| GetUserBookingsAsync | Query đúng theo userId, include details |

---

## 3. Lộ Trình Fix Hoàn Thiện UC08

```
┌─────────────────────────────────────────────────────────┐
│  Bước 1: Fix Race Condition + Transaction  (~2h)         │
│  - Gọi IsSlotAvailableAsync trước khi tạo Booking       │
│  - Bọc trong BeginTransaction / CommitTransaction        │
│  - Throw ConflictException (409) nếu slot đã bị chiếm   │
├─────────────────────────────────────────────────────────┤
│  Bước 2: Implement PricingService  (~2h)                 │
│  - Query PriceRuleDetails theo court → policy → slot     │
│  - Tính peak (×1.3) / off-peak / weekend surcharge       │
│  - Trả về đúng giá cho BookingService                    │
├─────────────────────────────────────────────────────────┤
│  Bước 3: SignalR Integration  (~1.5h)                    │
│  - Inject IHubContext<CourtStatusHub> vào BookingService │
│  - Broadcast SlotStatusChanged sau HoldSlot              │
│  - Broadcast SlotStatusChanged sau ConfirmBooking        │
├─────────────────────────────────────────────────────────┤
│  Bước 4: HoldSlotExpiryJob Logic  (~1h)                  │
│  - Query: Status=Held AND HoldExpiresAt < UtcNow         │
│  - Bulk update → Cancelled                               │
│  - Broadcast SignalR status="Available"                  │
├─────────────────────────────────────────────────────────┤
│  Bước 5: ConfirmBookingAsync  (~2h)                      │
│  - Validate booking tồn tại & còn trong Held             │
│  - Tạo PaymentTransaction record                         │
│  - Update status → Confirmed                             │
│  - Broadcast SignalR + tính LoyaltyPoints                │
├─────────────────────────────────────────────────────────┤
│  Bước 6: PromoCode Support  (~1h)                        │
│  - Thêm PromoCode? vào HoldSlotRequest                   │
│  - Validate Promotion (hạn, off-peak, min order, usage)  │
│  - Tính DiscountAmount / FinalAmount                     │
└─────────────────────────────────────────────────────────┘
```

**Tổng ước tính: ~9.5h để hoàn thiện UC08 đầy đủ theo SRS.**

---

## 4. Test Cases Gợi Ý

| # | Test Case | Expected Result |
|---|-----------|----------------|
| TC01 | POST hold với CourtId/Date/Slot hợp lệ (Player auth) | 201 Created, `status=Held`, `holdExpiresAt = now+10m` |
| TC02 | POST hold không đăng nhập, thiếu GuestName | 400 Validation Error |
| TC03 | POST hold không đăng nhập, đủ GuestName+Phone | 201 Created (guest booking) |
| TC04 | POST hold cùng 1 slot 2 request đồng thời | Request 1: 201 OK, Request 2: 409 Conflict |
| TC05 | POST hold slot đang trong bảo trì | 409 Conflict |
| TC06 | POST hold slot của SocialSession đang mở | 409 Conflict |
| TC07 | GET /my-bookings (authenticated) | 200 danh sách đơn của user |
| TC08 | GET /{id} booking hợp lệ | 200 chi tiết đơn |
| TC09 | Chờ 10 phút → GET /{id} | status vẫn `Held` (job chưa chạy - known issue) |
| TC10 | POST hold peak hour (17-21h) | SlotPrice = BasePrice × 1.3 |

---

*Báo cáo này được tạo tự động dựa trên phân tích mã nguồn và SRS document.*
