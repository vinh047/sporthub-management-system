# Báo cáo triển khai TV1 — Booking và lịch sân

## 1. Phạm vi

Triển khai và tích hợp chức năng xem lịch sân, giữ slot, chống đặt trùng, xác nhận thanh toán giả lập, hủy/hoàn tiền, tự giải phóng hold hết hạn và đồng bộ trạng thái qua SignalR. Mã trạng thái Booking đang dùng: `Held`, `Confirmed`, `Cancelled`, `Completed`, `NoShow`; `Held` tương ứng với trạng thái chờ thanh toán.

## 2. Thiết kế và luồng nghiệp vụ

### UC07 — Xem availability

- `GET /api/court/availability?facilityId={id}&sportId={id}&date=YYYY-MM-DD` trả về sân, khung giờ, giá và trạng thái.
- Trạng thái gồm `Available`, `Held`, `Confirmed`, `Social`, `Maintenance`, `Unavailable`.
- Kiểm tra Booking còn hạn/đã xác nhận, bảo trì giao nhau theo thời gian, Social Session Published/InProgress và Tournament match theo sân/giờ.
- Bảng giá và availability dùng chung `IPricingService`; chính sách hiệu lực gần nhất được chọn và phụ thu cuối tuần được áp dụng.
- Frontend chỉ cho chọn slot `Available`; các trạng thái còn lại được tô màu/khóa tương ứng trên `CourtTimeGrid`.

### UC08 — Giữ slot và chống đặt trùng

1. Người chơi click/tap từng giờ liên tiếp trên ma trận hoặc kéo qua một dải giờ trống; UI highlight slot và cập nhật giỏ hàng tức thì. Một lượt giữ sân chỉ hỗ trợ cùng sân/ngày và giờ liên tục theo hợp đồng backend.
2. Tính tổng giá của từng slot, kiểm tra danh sách slot hợp lệ, liên tiếp và không quá 24 slot trong ngày.
3. Mở transaction mức Serializable; khóa từng khóa `(CourtId, PlayDate, TimeSlotId)` bằng SQL Server `UPDLOCK, HOLDLOCK`, rồi kiểm tra lại xung đột trên toàn bộ khoảng giờ.
4. Nếu bất kỳ slot nào vừa bị chiếm, rollback toàn đơn và trả HTTP 409. Không có trường hợp giữ thành công một phần.
5. Tạo một Booking `Held` chứa nhiều BookingDetail, tổng giá bằng tổng giá các slot, hạn `HoldExpiresAt = UtcNow + 10 phút`; commit rồi broadcast từng slot qua SignalR.

Chỉ mục `(CourtId, PlayDate, TimeSlotId)` hỗ trợ tra cứu slot. SignalR phát sau khi dữ liệu commit để lỗi kết nối không làm mất đơn đã lưu.

### UC28 — Xác nhận

- `POST /api/booking/{id}/confirm` yêu cầu đăng nhập và chỉ chủ đơn được xác nhận.
- Chỉ Booking `Held` còn hạn mới được xác nhận; tạo PaymentTransaction giả lập, đổi trạng thái sang `Confirmed`, phát sự kiện trạng thái.
- Phương thức thanh toán seed `3` là `MOCK_ONLINE`; thao tác xác nhận lặp trên đơn đã xác nhận là idempotent.
- UI hiển thị QR giả lập và bộ đếm ngược từ `HoldExpiresAt`.

### UC13 — Hủy và hoàn tiền

- `POST /api/booking/{id}/cancel` yêu cầu chủ đơn và lý do hủy.
- Không cho hủy đơn đã tới giờ chơi, `Completed` hoặc `NoShow`.
- Đơn `Confirmed`: hoàn 100% nếu còn ít nhất 24 giờ; 50% nếu còn từ 6 đến dưới 24 giờ; dưới 6 giờ hoàn 0%.
- Đơn `Held` chưa thanh toán được hủy mà không tạo hoàn tiền.
- Lưu `BookingCancellation` (lý do, phần trăm/số tiền hoàn và tiền phạt), sau đó cập nhật SignalR.
- Giờ chơi được tính theo `Asia/Ho_Chi_Minh`; thời hạn hold dùng UTC. Schema hiện chưa lưu múi giờ riêng theo cơ sở.

### UC09 — Tự giải phóng hold

`HoldSlotExpiryJob` chạy mỗi 60 giây, chuyển Booking `Held` đã qua `HoldExpiresAt` thêm 2 phút grace thành `Cancelled`. Sau khi lưu, job xác định lại trạng thái slot (có xét khóa khác) rồi broadcast.

### SignalR

- Hub chính `/hubs/court-status`; `/hubs/courts` được giữ để tương thích client cũ.
- Client tham gia/rời group theo cơ sở và ngày (`JoinFacilityGroup`/`LeaveFacilityGroup`).
- Event `CourtSlotUpdated` mang court/date/slot/status; client cập nhật ô ngay và tham gia lại group sau reconnect.
- Application phụ thuộc `ICourtStatusNotifier`; adapter SignalR ở API, không để Application phụ thuộc trực tiếp Hub.

## 3. Các file chính

### Backend

- `backend/src/SportHub.Application/Services/BookingService.cs`: giữ nhiều giờ trong một booking/transaction, confirm, cancel, quyền sở hữu và chính sách hoàn tiền.
- `backend/src/SportHub.Application/Interfaces/Services/IBookingService.cs`, `ICourtStatusNotifier.cs`: hợp đồng nghiệp vụ và thông báo slot.
- `backend/src/SportHub.Application/Interfaces/Repositories/IBookingRepository.cs`, `IUnitOfWork.cs`: truy vấn nhiều slot, khóa slot và transaction.
- `backend/src/SportHub.Application/Services/CourtService.cs`: xây availability và giá từng slot.
- `backend/src/SportHub.Application/Services/PricingService.cs`: kiểm tra request giá và tính giá qua repository.
- `backend/src/SportHub.Infrastructure/Persistence/Repositories/BookingRepository.cs`: bốn nhóm xung đột (booking, maintenance, social, tournament), truy vấn nhiều slot và khóa dữ liệu.
- `backend/src/SportHub.Infrastructure/Persistence/Repositories/PricingRepository.cs`: lấy policy/rule có hiệu lực theo sân, môn, cơ sở và ngày.
- `backend/src/SportHub.Infrastructure/Persistence/Repositories/UnitOfWork.cs`: quản lý transaction.
- `backend/src/SportHub.Infrastructure/Persistence/SportHubDbContext.cs`: DbSet, index lookup slot, quy ước precision decimal mặc định `18,2` nếu chưa được cấu hình riêng.
- `backend/src/SportHub.Infrastructure/Persistence/Configurations/EntityConfigurations.cs`: precision cụ thể cho tiền, phần trăm và rating; cấu hình quan hệ.
- `backend/src/SportHub.Infrastructure/Migrations/20261105165406_BookingDetailsSlotLookupIndex.cs`: migration chỉ mục slot.
- `backend/src/SportHub.Infrastructure/BackgroundJobs/HoldSlotExpiryJob.cs`: tự hết hạn hold và phát trạng thái mới.
- `backend/src/SportHub.Infrastructure/BackgroundJobs/NoShowScannerJob.cs`: hiện chỉ là placeholder, chưa thực hiện quét NoShow.
- `backend/src/SportHub.Infrastructure/Data/DbSeeder.cs`: migration và dữ liệu core/fixture; seed ID cố định an toàn, dữ liệu có kiểm tra trước khi thêm.
- `backend/src/SportHub.Infrastructure/Persistence/Seed/DataSeeder.cs`: tài khoản Development Admin/Staff/Player và hồ sơ 26 Player mẫu; mật khẩu được hash qua `IPasswordHasher`.
- `backend/src/SportHub.API/Controllers/BookingController.cs`, `CourtController.cs`: REST endpoints Booking và availability.
- `backend/src/SportHub.API/Hubs/CourtStatusHub.cs`, `SignalRCourtStatusNotifier.cs`: nhóm SignalR và event trạng thái.
- `backend/src/SportHub.API/Program.cs`: chỉ seed khi truyền `--seed`; chạy API thường không seed/migrate. HTTPS redirect bật nếu có endpoint HTTPS hoặc môi trường không phải Development.
- `backend/src/SportHub.API/Booking.http`: luồng HTTP test với Player Development và token lấy từ response đăng nhập.

### Frontend

- `frontend/src/api/bookingApi.ts`: API client/DTO cho availability, hold, confirm, lịch sử và cancel.
- `frontend/src/components/CourtTimeGrid.tsx`: ma trận trạng thái, click-toggle slot và kéo chọn dải giờ.
- `frontend/src/components/booking/CourtBookingCart.tsx`: giỏ sticky desktop / drawer mobile; hiển thị giá từng slot, nhãn giờ cao điểm, tổng tiền và giữ chỗ.
- `frontend/src/components/HoldCountdownTimer.tsx`: đồng hồ theo hạn server, xử lý hết giờ một lần.
- `frontend/src/page/user/HomePage.tsx`: tìm sân nhanh chuyển bộ lọc môn/cơ sở/ngày sang trang Booking bằng query string; nếu cần đăng nhập thì giữ lại URL bộ lọc.
- `frontend/src/page/user/BookingPage.tsx`: khôi phục bộ lọc từ query string trước khi tải availability; quản lý slot click-toggle/kéo chọn cùng sân, xác thực liên tiếp, giữ toàn bộ slot cùng lúc, modal QR mock và SignalR.
- Giá `SlotAvailability.price` do availability API trả về được cộng trực tiếp; `isPeakHour` chỉ dùng để gắn nhãn vì giá backend đã tính khung giờ. Backend hiện chưa có chính sách giảm giá hạng thành viên nên giỏ thông báo rõ và chưa tự trừ khoản giảm.
- `frontend/src/page/user/MyBookingsPage.tsx`: lịch sử booking, trạng thái và modal lý do hủy.
- `frontend/src/hooks/useSignalR.ts`: join/leave group, cập nhật slot và reconnect.
- `frontend/src/App.tsx`, `frontend/src/layouts/PlayerLayout.tsx`: route/menu Booking.

## 4. Seed và tài khoản Development

Chạy từ `backend/src/SportHub.API`:

```powershell
dotnet run --seed
```

Lệnh này chạy migration, seed dữ liệu core và seed Development khi môi trường Development, sau đó thoát mà không chạy web server. `dotnet run` thông thường chỉ khởi chạy API, không tự seed/migrate. Với DB mới/chưa migrate, chạy seed tường minh trước.

| Vai trò | Điện thoại | Mật khẩu |
|---|---|---|
| Admin | `0900000000` | `Admin@123` |
| Staff | `0900000002` | `Staff@123` |
| Player mẫu | `0922222201`–`0922222206`, `0930000001`–`0930000020` | `Test@1234` |

Seed đã chạy trên SQL Server local `SportHubDb`; số lượng xác nhận khi kiểm thử: 32 users, 14 courts, 6 price policies, 37 bookings/41 booking details, 1 Social Session và 1 Tournament. Seed không xóa dữ liệu hiện có; tổng booking có thể tăng sau các lần test.

## 5. Kịch bản kiểm thử nghiệp vụ

Mở [Booking.http](../backend/src/SportHub.API/Booking.http) trong REST Client và chạy theo thứ tự. Đổi `@playDate` sang ngày tương lai, chọn `@timeSlotId` có status `Available` từ UC07; nếu slot đã được người khác dùng thì chọn slot khác.

| Mã | Thao tác | Kết quả mong đợi |
|---|---|---|
| Login | Đăng nhập Player `0922222201` / `Test@1234` | Thành công, response có `data.accessToken` |
| UC07 | Lấy availability theo facility/sport/date | Danh sách slot có status và giá; slot không trống không thể chọn |
| UC08 | Chọn một giờ bắt đầu, tăng thời lượng lên 2+ giờ liên tiếp và giữ sân | Một booking HTTP 201, nhiều `details`, tổng tiền bằng tổng giá từng giờ, mọi slot `Held`, một hạn giữ khoảng 10 phút |
| UC08 | Gửi lại cùng court/date/timeSlotIds | HTTP 409; không tạo đơn thứ hai và không giữ một phần |
| UC08 | Gửi danh sách giờ không liên tiếp | HTTP 400; yêu cầu chọn các giờ liền nhau |
| UC28 | Chủ đơn confirm với payment method 3 | HTTP 200, status `Confirmed`, transaction mock được lưu |
| UC History | Gọi `/api/booking/my-bookings` | Có booking vừa tạo trong lịch sử của Player |
| UC13 | Hủy đơn đã xác nhận và truyền reason | HTTP 200, status đổi `Cancelled`; tính hoàn theo mốc >=24h/6–24h/<6h |
| UC09 | Tạo hold, đợi hết hạn + 2 phút grace và tối đa 60 giây job | Booking thành `Cancelled`; slot trở lại `Available` nếu không có xung đột khác |
| Social | Cơ sở 1, môn 1, ngày seed +2, sân 3, 18:00–20:00 | Các slot giao thời gian trả `Social` |
| Tournament | Cơ sở 2, môn 4, ngày seed +3, sân 13, trận lúc 18:00 | Slot giao thời gian không khả dụng (`Social`) |
| Maintenance | Sân 4, ngày seed/ngày seed +1, 06:00–12:00 | Các slot giao thời gian trả `Maintenance` |

Các ngày ở ba kịch bản cuối tính theo ngày Việt Nam khi seed chạy. Fixture hold mẫu có thời hạn ngắn, vì vậy không nên phụ thuộc nó cho kiểm thử dài hạn; dùng flow UC08 để tạo hold mới.

## 6. Kết quả xác minh hiện tại

- Backend: `dotnet build backend/SportHub.slnx --no-restore` thành công, 0 warning, 0 error.
- Test project: 1 passed, 0 failed (`dotnet test backend/tests/SportHub.Tests/SportHub.Tests.csproj --no-build`).
- NuGet audit: không phát hiện package vulnerable theo nguồn NuGet hiện tại; đã nâng `Microsoft.AspNetCore.SignalR.Common` lên `10.0.13` và cập nhật `System.Security.Cryptography.Pkcs` lên `9.0.21`.
- Seed command chạy thành công, không còn runtime warning; API startup bình thường không thay đổi số booking (37 trước/sau startup).
- API smoke test thật với Player `0922222201`: login thành công; availability sân 1/slot 10 có giá 96,000; hold tạo Booking 38 (`Held`); hold trùng HTTP 409; confirm trả `Confirmed`; my-bookings có dữ liệu; cancel thành công, ghi nhận hoàn 50% (48,000) và availability trở về `Available`.
- Multi-hour API smoke: một request giữ 2 slot liên tiếp thành một booking có 2 details (06:00–08:00, tổng 192,000); giữ trùng cả dải trả HTTP 409; booking kiểm thử được hủy sau đó.
- API `/api/health` trả HTTP 200; khởi động API bằng launch profile mặc định không tự seed và không còn warning HTTPS redirect.
- Các fixture xác nhận qua availability API: Social sân 3/cơ sở 1/môn 1 ngày 2026-11-08 slot 13–14; Tournament sân 13/cơ sở 2/môn 4 ngày 2026-11-09 slot 13; Maintenance sân 4 ngày 2026-11-07 slot 1 và 6 là `Maintenance`, slot 7 sau giờ kết thúc bảo trì là `Available`.
- Frontend build và lint đã thành công; smoke test UI trước đó xác nhận Booking tải availability, chọn slot mở modal và tích hợp trạng thái/SignalR. QR hiện vẫn mô phỏng.
- Tìm sân nhanh trên landing page đã nối với Booking: các bộ lọc môn/cơ sở/ngày được giữ qua bước đăng nhập và nạp vào bộ lọc availability. Frontend build và lint được chạy lại sau thay đổi này.

## 7. Phụ thuộc và phần chưa hoàn tất

1. **TV3 — Giá/danh mục/voucher:** đọc và tính giá đã triển khai để TV1 hold hoạt động. `UpsertPricePolicyAsync`, API danh mục cơ sở/môn thể thao và gắn voucher vào hold vẫn chưa triển khai; frontend hiện dùng lựa chọn theo ID seed.
2. **TV5 — Thanh toán thật:** confirm chỉ ghi nhận giao dịch mô phỏng; chưa xác minh webhook/ngân hàng, chưa tạo VietQR thanh toán thật. Hủy hiện ghi nhận khoản hoàn, chưa gọi cổng hoàn tiền.
3. **TV2 — Notification/CRM:** TV1 chỉ phát SignalR trạng thái sân, chưa gửi thông báo cá nhân hoặc cập nhật CRM/Loyalty khi booking đổi trạng thái.
4. **TV4 — NoShow/Reputation:** `NoShowScannerJob` còn placeholder và `ReputationService` chưa triển khai; chưa đánh dấu NoShow/trừ điểm.
5. **Tournament/Maintenance fixture:** đã seed idempotent và xác nhận các trạng thái xung đột qua availability API. Sân mẫu CL-04 được giữ active để trạng thái maintenance hiển thị trong ma trận; thời gian bảo trì quyết định slot nào bị khóa.
