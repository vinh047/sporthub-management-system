# Báo cáo Refactor Tầng Domain Entities

## Vấn đề ban đầu
Trong cấu trúc cũ, các Entities được nhóm chung vào các file lớn (ví dụ: `AuthEntities.cs`, `FacilityEntities.cs`, `RemainingEntities.cs`). Điều này dẫn đến khó khăn trong việc tìm kiếm class, khó quản lý git (dễ gây conflict khi nhiều người cùng sửa 1 file) và vi phạm nguyên tắc "1 file = 1 class" phổ biến trong C#.

## Những thay đổi đã thực hiện
Đã thực hiện tách toàn bộ các file chứa nhiều class thành từng file `.cs` riêng biệt, tương ứng 1 file chứa 1 class duy nhất. Đồng thời, cấu trúc thư mục và Namespace cũng được chuẩn hoá lại.

### 1. Thư mục `Auth` (`SportHub.Domain.Entities.Auth`)
Từ file `AuthEntities.cs` đã được tách thành:
- `User.cs`
- `Role.cs`
- `UserRole.cs`
- `Permission.cs`
- `RolePermission.cs`
- `StaffProfile.cs`
- `StaffPermissionOverride.cs`

### 2. Thư mục `Booking` (`SportHub.Domain.Entities.Booking`)
Từ file `BookingEntities.cs` đã được tách thành:
- `Booking.cs`
- `BookingDetail.cs`
- `CheckInLog.cs`
- `BookingCancellation.cs`

### 3. Thư mục `Facility` (`SportHub.Domain.Entities.Facility`)
Từ các file `FacilityEntities.cs` và `PricingEntities.cs` đã được tách thành:
- `Facility.cs`
- `Sport.cs`
- `Court.cs`
- `CourtMaintenance.cs`
- `TimeSlot.cs`
- `PricePolicy.cs`
- `PriceRuleDetail.cs`

### 4. Thư mục `Matching` (`SportHub.Domain.Entities.Matching`)
Từ file `MatchingEntities.cs` đã được tách thành:
- `MatchRoom.cs`
- `MatchMember.cs`
- `MatchMemberLeaveLog.cs`

### 5. Thư mục `Payment` (`SportHub.Domain.Entities.Payment`)
Từ file `PaymentEntities.cs` đã được tách thành:
- `PaymentMethod.cs`
- `PaymentTransaction.cs`

### 6. Cấu trúc lại các Entity còn lại (Từ `RemainingEntities.cs`)
File `RemainingEntities.cs` chứa rất nhiều Entities không liên quan đến nhau. Nó đã bị xoá và các class bên trong được phân về đúng domain folder của nó:
- **Notifications** (`SportHub.Domain.Entities.Notifications`):
  - `NotificationTemplate.cs`
  - `UserNotification.cs`
  - `UserDeviceToken.cs`
- **Player** (`SportHub.Domain.Entities.Player`):
  - `PlayerProfile.cs`
  - `UserFavoriteSport.cs`
  - `ReputationHistory.cs`
- **System** (`SportHub.Domain.Entities.System`):
  - `SystemAuditLog.cs`
  - `SystemSetting.cs`

### 7. Cập nhật References & Namespace
- Xoá thành công tất cả các file "Entities.cs" cũ.
- Cập nhật namespace trong `SportHubDbContext.cs` (`SportHub.Infrastructure`) để include đúng các thư mục mới (`Notifications`, `Player`, `System`).
- Cập nhật references cho thuộc tính `UserFavoriteSport` và `PlayerProfile` bên trong `EntityConfigurations.cs` và `Services.cs`.

> **Kết quả:** Dự án hiện đã tuân thủ chặt chẽ nguyên tắc 1 class - 1 file, cấu trúc cây thư mục sáng sủa và đã **Build Succeeded** hoàn toàn 100%. Mọi thứ vẫn tiếp tục hoạt động trơn tru.
