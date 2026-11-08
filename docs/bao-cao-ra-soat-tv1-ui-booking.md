# Báo cáo rà soát nhiệm vụ TV1 — UI, Booking và tích hợp backend

**Ngày rà soát:** 07/11/2026  
**Phạm vi:** UI đặt sân của Player, luồng Booking từ API đến dữ liệu, các cơ chế nền/realtime, cùng những tích hợp TV1 phụ thuộc hoặc dùng chung với thành viên khác.  
**Cách đánh giá:** Đối chiếu bảng phân công `docs/phancong_updated.xlsx`, đọc mã nguồn hiện tại và chạy build/lint. Các chức năng đánh dấu “đã có” là đã thấy trong source; không mặc định mọi tình huống production đã được nghiệm thu.

## 1. Kết luận nhanh

- **Phần lõi TV1 — xem availability, giữ nhiều giờ, chống giữ trùng, thanh toán VNPay, hủy/hoàn và cập nhật trạng thái lịch — đã được triển khai trong source.**
- **UI đặt sân** có ma trận trạng thái, lọc ngày/cơ sở/môn, click-toggle, kéo chọn giờ liên tiếp, giỏ hàng sticky/drawer, luồng giữ chỗ và countdown. Đã từng smoke test desktop/mobile; build và lint hiện tại đều đạt.
- **Chưa thể coi toàn bộ luồng nghiệp vụ dự án hoàn thành:** voucher/CRM, notification cá nhân, NoShow/Reputation và nhiều màn hình quản trị liên quan vẫn thiếu hoặc là placeholder.
- **Payment sandbox đã được nối end-to-end ở mức mã nguồn**, nhưng cần merchant credentials hợp lệ, HTTPS public IPN URL đăng ký ở VNPay và giao dịch Sandbox thực tế để nghiệm thu đối soát/refund.
- **Test tự động backend bao phủ chữ ký VNPay, IPN thành công/idempotency/sai số tiền, và refund một phần không gửi lặp**, cùng với race condition/expiry; chưa thay thế giao dịch Sandbox thật.
- **Đã xử lý trong lượt bổ sung:** ma trận khóa giờ đã bắt đầu; lựa chọn đang mở được tự bỏ khỏi giỏ khi giờ bắt đầu.
- **Đã bổ sung kiểm thử:** integration test SQL Server chạy hai yêu cầu giữ đồng thời trên cùng slot; job expiry có test một lượt xử lý cô lập.

## 2. Bảng mức độ hoàn thành TV1

| Hạng mục được giao | Mức độ | Đã thấy trong code | Còn phụ thuộc / cần kiểm tra |
|---|---|---|---|
| UC07 — Xem availability theo cơ sở, môn, ngày | ✅ Hoàn thành phần lõi | API trả danh sách sân, trạng thái từng slot, giá và giờ cao điểm; UI vẽ ma trận, khóa giờ đã qua và tự bỏ selection khi giờ đến. | Danh mục cơ sở/môn trong UI hiện cấu hình cứng theo ID seed, chưa lấy API catalog. |
| UC08 — Giữ slot và chống đặt trùng | ✅ Hoàn thành phần lõi | Cho phép nhiều slot liên tiếp; validate request; mở transaction `Serializable`, khóa slot và kiểm tra trạng thái; xung đột trả 409; một booking nhiều BookingDetail. Đã có integration test hai request đồng thời cùng slot. | Gắn voucher chưa có; integration test cần SQL Server và `SPORTHUB_TEST_CONNECTION`. |
| UC09 — Job tự giải phóng hold | ✅ Đã triển khai và có test | `HoldSlotExpiryJob` quét mỗi phút; chỉ hết hạn sau thời gian hold 10 phút cộng 2 phút grace; đổi trạng thái rồi phát cập nhật slot. Test kiểm tra quá grace thì Cancelled + notify, còn trong grace thì Held. | Test logic chạy một lượt trên EF InMemory; chưa phải kiểm thử kéo dài hosted service/restart/deploy nhiều replica. |
| UC13 — Hủy booking và tính hoàn | ✅ Hoàn thành phần nghiệp vụ + tích hợp Sandbox | Kiểm tra chủ đơn/trạng thái/thời điểm; Held hủy không hoàn; Confirmed tính 100% từ 24h, 50% từ 6–24h, 0% dưới 6h; gửi VNPay refund về giao dịch gốc khi có giao dịch VNPay thành công. | Thời gian 1–3 ngày làm việc là dự kiến sau khi VNPay chấp nhận yêu cầu; source không tự xác nhận tiền đã về tài khoản. |
| UC28 — Thanh toán booking | ✅ Tích hợp VNPay Sandbox | Tạo URL ký HMAC-SHA512, lưu giao dịch Pending; chỉ IPN hợp lệ, đúng mã/amount/trạng thái mới xác nhận booking; Return URL chỉ dùng phản hồi UX. | Cần credentials thật của merchant Sandbox, cấu hình IPN HTTPS public trên VNPay và kiểm tra phản hồi/refund với tài khoản cụ thể. |
| SignalR cập nhật lịch sân | ✅ Đã triển khai | Server phát `CourtSlotUpdated` sau thay đổi booking; client tham gia group theo cơ sở/ngày và cập nhật state cục bộ; có reconnect. | Cần test chéo nhiều tab/client và trạng thái reconnect trên môi trường tích hợp. |
| UI chọn slot, giỏ hàng, countdown | ✅ Hoàn thành tương tác chính | Click-toggle, kéo chọn, ràng buộc cùng sân/giờ liền, giá từ API, Peak label, sticky cart desktop, drawer mobile, countdown theo hạn server. | Kéo bằng chuột đã smoke test; thao tác kéo trên thiết bị cảm ứng thật và accessibility screen-reader chưa được nghiệm thu. |
| Hỗ trợ check-in / POS / voucher trong end-to-end | 🟡 Tích hợp một phần | Có màn hình Check-in và POS riêng; check-in booking đã xác nhận có API. | UI booking chưa gắn voucher; POS còn sân/slot/giá cứng; check-in chưa chuyển trạng thái booking sang InUse hoặc cộng reputation. |

**Đánh giá tổng thể TV1:** phần lõi Booking/UI và luồng tích hợp VNPay Sandbox đã có; việc nghiệm thu cổng thanh toán vẫn phụ thuộc credentials, public IPN và khả năng refund của merchant. Toàn dự án vẫn mới hoàn thành một phần do voucher chưa tích hợp, NoShow/Reputation và một số màn hình/servive của các thành viên khác còn thiếu.

## 3. Luồng UI → API → Database → Event

### 3.1 Người chơi chọn sân

1. `/player/booking` đọc `facilityId`, `sportId`, `date` từ query string nếu có; nếu không thì dùng lựa chọn mặc định.
2. UI gọi `GET /api/court/availability?facilityId=...&sportId=...&date=...`.
3. Backend lấy các sân phù hợp, tra từng slot và giá; trạng thái được suy ra từ booking, bảo trì, social session và tournament match.
4. `CourtTimeGrid` chỉ cho thao tác trên slot `Available`; các trạng thái bận hiển thị nhãn/màu riêng.
5. Giá slot được backend tính/trả về. UI cộng giá từ API; nhãn `Peak` không tự nhân giá lần nữa. Hiện không trừ membership discount.

### 3.2 Giữ chỗ

1. UI chỉ cho giữ khi có slot, cùng một sân, liền nhau và còn Available.
2. `POST /api/booking/hold` gửi `courtId`, ngày, danh sách `timeSlotIds`.
3. Backend kiểm tra slot tồn tại/thứ tự liền giờ/ngày hợp lệ, lấy giá, tạo booking Held và các chi tiết.
4. Trong transaction `Serializable`, repository khóa slot và kiểm tra trạng thái mới nhất. Nếu slot không còn Available, rollback và trả Conflict (HTTP 409 qua exception handler).
5. Sau commit, server phát `CourtSlotUpdated` trạng thái `Held` cho từng slot.
6. Frontend mở thông tin giữ sân, hiển thị hạn thanh toán và chuyển khách sang URL VNPay Sandbox.

Frontend hiện tránh diễn giải các sự kiện `Held` phát ra trong chính request hold thành “người khác lấy slot”; đây là sửa lỗi thông báo lặp trước đó. Lỗi API thật vẫn phải hiện thông báo lỗi.

### 3.3 Thanh toán, hủy/hoàn và hết hạn

- Payment: `POST /api/payment/bookings/{id}/vnpay` kiểm tra chủ đơn/hold, tạo URL có chữ ký và lưu PaymentTransaction Pending. Return URL chỉ kiểm tra chữ ký để hiện UX; IPN là nguồn xác nhận. IPN phải khớp mã tham chiếu, amount (đơn vị VNĐ × 100), ResponseCode và TransactionStatus; xử lý lặp không xác nhận/gửi hoàn lặp.
- Cancel/refund: chủ đơn gửi lý do; backend tính 100% từ 24h, 50% từ 6–24h, 0% dưới 6h. Nếu có giao dịch VNPay thành công và số tiền được hoàn lớn hơn 0, hệ thống gửi lệnh refund (full/partial) về giao dịch gốc, lưu giao dịch refund riêng và trạng thái `Processing`/`Failed`. Thanh toán cũ không qua VNPay được đánh dấu cần nhân viên xử lý thủ công.
- Thông báo 1–3 ngày làm việc là dự kiến sau khi VNPay chấp nhận yêu cầu; phản hồi chấp nhận từ Sandbox không chứng minh tiền thật đã quyết toán. Không có IPN/đối soát quyết toán refund trong source để tự chuyển `Processing` thành `Completed`.
- Expiry: hosted job chạy nền; sau khi hết hạn + grace, chuyển Held sang Cancelled, hỏi lại trạng thái slot (để không mở nhầm slot đang bị chiếm bởi xung đột khác) rồi phát event.

## 4. Những thao tác UI cần nghiệm thu

### `/` — Tìm sân nhanh

- Chọn cơ sở/môn/ngày và chuyển qua trang booking; kiểm tra query string giữ đúng bộ lọc.
- Thử mở booking khi chưa đăng nhập và đăng nhập tiếp tục đúng URL/bộ lọc.
- Danh sách cơ sở/môn hiện là lựa chọn tĩnh; đối chiếu với dữ liệu seed.

### `/login` và `/player`

- Đăng nhập Player hợp lệ/không hợp lệ; xác nhận route guard và menu theo vai trò.
- Truy cập route Player khi logout; xác nhận bị chuyển về login.
- Kiểm tra điều hướng tới đặt sân và lịch sử đặt sân.

### `/player/booking` — màn hình trọng tâm

- Đổi cơ sở, môn, ngày; xác nhận tải lại availability và xóa selection cũ.
- Kiểm tra giờ Available/Held/Confirmed/Social/Maintenance, tooltip/nhãn và không cho click slot bận.
- Click chọn/bỏ chọn; kéo chọn nhiều giờ liền theo cả hai chiều; thử giờ rời nhau và sân khác.
- Kiểm tra giỏ sticky desktop, xóa từng giờ, tổng tiền và Peak; trên mobile mở/đóng drawer, vuốt ngang ma trận và kiểm tra không tràn trang.
- Giữ slot: xác nhận mã booking, các giờ, giá, timer, thông báo khi xung đột thật; thử nhiều slot để bảo đảm không phát toast lặp.
- Giữ slot rồi thanh toán Sandbox: URL tạo đúng số tiền, hoàn tất giao dịch trong VNPay; kiểm tra booking chỉ sang Confirmed sau IPN hợp lệ (không dựa vào query string Return).
- Thử IPN sai chữ ký/sai amount, gửi IPN thành công hai lần; chỉ giao dịch đúng mới xác nhận và không phát sinh xử lý trùng.
- Hủy booking đã trả VNPay ở mốc đủ điều kiện hoàn 100%/50%/0%; xác nhận refund về giao dịch gốc, trạng thái và ghi chú 1–3 ngày làm việc. Với đơn mock/tiền mặt cũ, kiểm tra trạng thái yêu cầu xử lý thủ công thay vì báo hoàn tự động.
- Hủy hold chưa thanh toán, để hold hết hạn; kiểm tra grid và lịch sử sau mỗi thao tác.
- Mở cùng cơ sở/ngày ở hai trình duyệt để kiểm tra SignalR: client còn lại nhận event và không thể giữ lại slot đã bị chiếm.
- **Ngày hôm nay:** các slot bắt đầu không muộn hơn giờ `Asia/Ho_Chi_Minh` bị disable; nếu slot đang nằm trong giỏ thì được tự bỏ khỏi lựa chọn khi đồng hồ cập nhật (chu kỳ 5 giây). Backend vẫn kiểm tra giờ bắt đầu để chống request cũ/giả lập.
- Thử lỗi backend/API offline, lỗi tải availability và thao tác trong lúc loading.

### `/player/my-bookings`

- Có/không có dữ liệu; xem nhãn trạng thái, chi tiết giờ/sân, tổng tiền.
- Hủy với lý do trống để kiểm tra validation; thử quay lại/đóng hộp thoại; hủy thành công và xác nhận danh sách cập nhật.
- Kiểm tra đơn Held và Confirmed; đơn đã tới giờ chơi/đã hủy không được hủy theo chính sách.

### Các route khác cần smoke test khi kiểm tra tích hợp

- `/staff/reception`, `/admin/reception`: tra cứu và check-in; staff chỉ thao tác đơn thuộc cơ sở mình.
- `/staff/pos`, `/admin/pos`: lưu ý dữ liệu sân/slot/giá là mẫu cố định, không dùng để xác nhận bảng giá thật.
- `/admin`: dashboard hiện chưa có báo cáo backend hoàn chỉnh.
- `/register`: smoke test form/validation, không thuộc luồng booking chính.

## 5. Cơ chế đặc biệt ngoài CRUD

### Middleware / pipeline HTTP

- `GlobalExceptionHandler` là middleware toàn cục: chuyển Domain Validation thành 400, NotFound 404, Conflict 409, Unauthorized 401, Forbidden 403; lỗi ngoài dự kiến thành 500 với thông báo chung và log exception.
- JWT Authentication middleware xác thực issuer/audience/key/expiry; hỗ trợ lấy `access_token` từ query string khi request tới `/hubs` để SignalR dùng JWT.
- Authorization middleware áp dụng `[Authorize]` và route guard theo role; Booking hold hỗ trợ Player đăng nhập hoặc Guest có thông tin liên hệ; thanh toán, hủy, history/detail yêu cầu đăng nhập. VNPay IPN/Return là public callback nhưng chỉ IPN qua chữ ký/amount/order matching mới thay đổi trạng thái.
- CORS cấu hình origin từ config và `AllowCredentials` để hỗ trợ SignalR.
- Serilog request logging và Swagger chỉ bật UI trong Development.
- Không thấy một middleware riêng cho “booking event”; event được gọi tường minh từ service sau commit qua `ICourtStatusNotifier`.

### Event / SignalR

- `CourtStatusHub`: `/hubs/court-status` và alias tương thích `/hubs/courts`; join/leave group theo `facility-{id}-{yyyy-MM-dd}` (hub cũng hỗ trợ group cũ chỉ theo cơ sở).
- Event `CourtSlotUpdated`: `courtId`, `date`, `timeSlotId`, `status`; được phát sau hold/payment success/cancel/expiry.
- `SignalRCourtStatusNotifier` bắt lỗi khi broadcast và ghi warning, tránh để lỗi kết nối realtime đảo ngược nghiệp vụ booking đã commit.
- `NotificationHub` `/hubs/notifications` có `[Authorize]`; tuy nhiên `NotificationService` còn `NotImplementedException`, nên hub được map chưa đồng nghĩa hệ thống đã thực sự gửi notification.
- Không thấy `TournamentHub` hoặc event live bracket trong API hiện tại.

### Background jobs / vận hành

- `HoldSlotExpiryJob`: chạy trong API process, chu kỳ 1 phút, quá `HoldExpiresAt` thêm 2 phút; lưu thay đổi trước khi phát trạng thái mới.
- Chi tiết vòng đời job, chạy thử và giới hạn vận hành được ghi ở mục 8 bên dưới.
- `NoShowScannerJob`: hiện chỉ là khung `BackgroundService`/TODO; chưa query booking, check-in log, đổi NoShow hoặc trừ reputation.
- Seed chỉ chạy khi khởi động với `--seed`; API run thông thường không tự seed. Cần dùng đúng lệnh seed khi dựng môi trường kiểm thử mới.

## 6. Phụ thuộc các thành viên khác — phạm vi và trạng thái thấy trong source

Các vai trò dưới đây lấy từ bảng phân công cập nhật trong `docs/phancong_updated.xlsx`. Đây là rà soát trạng thái code hiện có, không phải đánh giá cá nhân.

| Thành viên | Phạm vi được phân công | Tình trạng / tích hợp cần để ý |
|---|---|---|
| **TV2 — Auth, role, Notification, CRM** | JWT, route authorization, Staff permission, notification realtime, kịch bản sinh nhật/Win-back | Login/JWT và guard đã được dùng; NotificationHub tồn tại nhưng `NotificationService` chưa triển khai. Không thấy pipeline CRM sinh nhật/Win-back hoàn chỉnh. Kiểm tra claim role/facility và quyền trên các route staff/admin. |
| **TV3 — Facility, Court, giá, maintenance, voucher** | CRUD cơ sở/sân, giá theo khung giờ/cuối tuần, maintenance, promotion/voucher | Availability và truy vấn giá đã được nối để Booking hoạt động. `FacilityService` CRUD, `CourtService.CreateCourtAsync`, `LockCourtForMaintenanceAsync`, `PricingService.UpsertPricePolicyAsync` còn `NotImplementedException`. Booking UI đang dùng catalog ID cứng; voucher chưa được gắn vào hold. |
| **TV4 — Social, Skill Rating, Reputation, NoShow** | Social session, bán slot/check-in, Elo/DUPR, reputation/phạt vắng | Booking availability có chặn slot trùng Social; tuy nhiên `MatchRoomService` và `ReputationService` còn placeholder; `NoShowScannerJob` chưa triển khai. Cần kiểm tra các API Social/Rating độc lập trước khi coi phân hệ này hoàn thành. |
| **TV5 — Tournament, payment, POS, check-in, dashboard** | Tournament/bracket, VietQR, POS/check-in, doanh thu/occupancy, tournament realtime | Booking hiện đã có VNPay Sandbox riêng cho player; POS/check-in, refund reconciliation/dashboard vẫn cần phối hợp nếu được giao chung. POS UI dùng sân/slot/giá cứng; `ReportService` còn placeholder; chưa thấy `TournamentHub`/API tournament controller trong danh sách controllers. Kiểm tra quyền theo cơ sở và status check-in. |

### Ranh giới trách nhiệm quan trọng

- **Giá:** TV3 cung cấp policy/tính giá; Booking đọc giá từ `IPricingService`; không nhân Peak lần nữa ở UI.
- **Voucher:** TV3 tạo/chính sách voucher, TV1 cần tích hợp tính/ghi nhận giảm vào booking; hiện chưa tích hợp.
- **Thanh toán:** luồng Booking Player dùng VNPay Sandbox; TV5 vẫn cần phối hợp nếu payment cho POS/tournament, đối soát quyết toán hoặc báo cáo doanh thu thuộc phạm vi của bạn.
- **Notification:** TV1 phát event trạng thái slot cho ma trận; TV2 phụ trách notification cá nhân/CRM. Không nhầm hai luồng này.
- **NoShow/reputation:** TV1 giữ slot và tự nhả Held; NoShow/Reputation thuộc tích hợp TV4, hiện chưa chạy nghiệp vụ.
- **Check-in:** route staff thuộc luồng TV5; service hiện ghi `CheckInLog`, nhưng TODO cho BookingStatus.InUse và cộng reputation chưa hoàn thiện.

## 7. Các điểm cần lưu ý trước khi kết luận “hoàn thành”

1. **Booking nhiều giờ:** yêu cầu giữ là các time slot liên tiếp, cùng sân/ngày; một booking có nhiều BookingDetail. Không phải một yêu cầu có thể chọn nhiều sân.
2. **Thanh toán/hoàn tiền:** luồng redirect/IPN và lệnh refund VNPay Sandbox đã có. Không cần thu tài khoản ngân hàng để hoàn về giao dịch gốc. Cần đặt HashSecret bằng User Secrets/biến môi trường, cấu hình ReturnUrl/FrontendReturnUrl và đăng ký IpnUrl HTTPS public ở portal; không đưa secret vào appsettings/repository. Phải kiểm thử giao dịch với merchant Sandbox thực tế.
3. **Refund settlement:** API chấp nhận yêu cầu refund không phải xác nhận tiền đã về; hiện trạng thái giữ `Processing` và UI ghi dự kiến 1–3 ngày làm việc. Muốn tự chuyển `Completed` cần thêm cơ chế đối soát/trạng thái từ provider.
4. **Realtime:** notification trong cùng request hold là hành vi mong đợi, không phải slot bị người khác lấy. Realtime chỉ đồng bộ status; không thay thế API/DB làm nguồn chân lý.
5. **Mobile/accessibility:** drawer và vùng cuộn lịch đã được smoke test ở viewport mobile; cần thử thiết bị thật, thao tác cảm ứng và bàn phím/screen-reader trước nghiệm thu UX.
6. **Thời gian/múi giờ:** BookingService dùng `Asia/Ho_Chi_Minh` cho giờ bắt đầu/xác nhận/hủy; expiry lưu UTC. Cần giữ thống nhất khi kiểm thử Docker/DB.
7. **Nhiều bản API:** job là `BackgroundService` đăng ký trong mỗi tiến trình API. Nếu scale nhiều replica thì mỗi replica hiện chạy một vòng quét; trước khi triển khai nhiều replica nên bổ sung distributed lock hoặc tách worker.

## 8. HoldSlotExpiryJob — hoạt động trong code và hệ thống

### Thành phần và vòng chạy

1. `DependencyInjection.AddInfrastructureServices` đăng ký `HoldSlotExpiryJob` bằng `AddHostedService`; vì vậy ASP.NET Host khởi động job cùng API và dừng job theo `CancellationToken` khi host shutdown.
2. `ExecuteAsync` chạy vòng lặp: gọi `ProcessExpiredBookingsAsync`; nếu thành công thì đợi 1 phút rồi quét tiếp. Nếu lỗi thì ghi log Error, đợi 30 giây rồi thử lại. Khi host đang dừng, `OperationCanceledException` kết thúc vòng lặp.
3. `ProcessExpiredBookingsAsync` tạo DI scope mới cho lượt chạy và lấy `SportHubDbContext` cùng `IBookingRepository`.
4. Ngưỡng truy vấn là `HoldExpiresAt < DateTime.UtcNow.AddMinutes(-2)`, đồng thời booking phải còn `Held`. Đây là 10 phút giữ chỗ do BookingService đặt cộng thêm 2 phút grace. Hold chưa tới hết hạn+grace không bị đổi.
5. Job tải các booking đủ điều kiện cùng `BookingDetails`/`Court`, đổi chúng sang `Cancelled`, rồi gọi `SaveChangesAsync`. **DB được lưu trước khi phát realtime.**
6. Với mỗi chi tiết slot, job gọi lại `GetSlotStatusAsync` để tính trạng thái thực sự sau khi hủy: `Available` chỉ khi không còn booking/maintenance/social/tournament khác chặn slot. Sau đó gọi `ICourtStatusNotifier`; adapter SignalR phát `CourtSlotUpdated`.
7. Nếu broadcast SignalR thất bại, adapter log warning; booking đã lưu vẫn Cancelled. Nếu query/save của lượt job lỗi, worker log error và thử lại ở vòng sau.

### Thời điểm slot thật sự được nhả

- Countdown UI hết ở `HoldExpiresAt` (10 phút); đây là hết thời gian thanh toán.
- Backend vẫn bảo vệ slot thêm 2 phút grace. Sau đó job chỉ quét mỗi 1 phút, nên thời gian DB chuyển Cancelled và event nhả sân thường là sau mốc hết hạn+2 phút, cộng độ trễ tới lần quét kế tiếp và thời gian xử lý.
- Vì vậy countdown về `00:00` **không đồng nghĩa ô lịch lập tức Available**. Trong khoảng grace/đợi vòng quét, availability có thể vẫn báo Held; đây là chủ đích chống nhả slot quá sớm.

### Cách tự theo dõi khi chạy local

- Khởi động API bình thường; xem log có `HoldSlotExpiryJob started`.
- Tạo một booking Held bằng `POST /api/booking/hold`, ghi lại `holdExpiresAt` và booking code.
- Chờ qua `holdExpiresAt + 2 phút`, cộng tối đa khoảng một chu kỳ job (60 giây) và thời gian xử lý; kiểm tra DB booking chuyển Cancelled và gọi availability để xem trạng thái mới.
- Nếu SignalR client đang mở cùng facility/date thì kiểm tra event; nếu slot bị nguyên nhân khác chiếm, trạng thái phát ra có thể là Held/Confirmed/Maintenance/Social thay vì Available.
- Job không phụ thuộc giao diện đang mở; UI chỉ nhận event. Nếu API process dừng, job cũng dừng và chạy tiếp sau khi API khởi động.

### Test đã thêm cho job

`Expiry_job_cancels_holds_past_grace_and_notifies_the_released_slot` dùng EF InMemory với một hold đã qua grace và một hold còn trong grace; gọi trực tiếp một lượt `ProcessExpiredBookingsAsync`; khẳng định booking quá ngưỡng thành Cancelled, booking còn grace vẫn Held và notifier phát đúng một event Available. Đây là test deterministic cho logic truy vấn/chuyển trạng thái/broadcast, không phải test chờ 10–13 phút trên hosted service thật.

### Chạy test

```powershell
$env:SPORTHUB_TEST_CONNECTION = "Server=localhost;Database=SportHubDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
dotnet test backend\tests\SportHub.Tests\SportHub.Tests.csproj
```

`SPORTHUB_TEST_CONNECTION` phải trỏ tới SQL Server có migration/seed phù hợp; nếu không khai báo thì test concurrency được skip có chủ đích. Có thể dùng connection string SQL Server Docker đã cấu hình trên máy, không ghi mật khẩu vào source. Test concurrency dùng ngày tương lai ngẫu nhiên và dọn booking do test tạo; sau lần chạy đã kiểm tra số booking DB không đổi (47) và không còn BookingDetail của fixture năm 2099.

## 9. Kiểm tra đã chạy trong lượt rà soát

- `dotnet build backend\src\SportHub.API\SportHub.API.csproj --no-restore` với output cô lập: **thành công, 0 warning, 0 error**.
- Frontend `tsc -b` + `vite build`: **thành công**; `oxlint`: **thành công**. Script `npm run build` chưa chạy được do pnpm shim trên máy trỏ tới file thực thi không tồn tại; các lệnh local tương đương đã chạy trực tiếp.
- `dotnet test backend\tests\SportHub.Tests\SportHub.Tests.csproj --no-restore`: **8 passed, 0 failed, 1 skipped**. Test concurrency bị skip do lượt này không có `SPORTHUB_TEST_CONNECTION`; các lượt trước đã chạy test này trên SQL Server local.
- Payment tests kiểm tra chữ ký URL và response refund, IPN thành công/idempotency/sai amount, chữ ký không hợp lệ, và refund một phần chỉ gửi một lần. Chưa thực hiện giao dịch merchant Sandbox thật vì cần secret hợp lệ và IPN HTTPS public.
- Đã scaffold migration `VnPayPaymentAndRefundFlow`; migration chưa được áp dụng vào database trong lượt này.
- Test concurrency `Concurrent_holds_for_the_same_slot_create_one_booking_and_return_one_conflict` thực hiện hai `HoldSlotAsync` đồng thời trên cùng `(CourtId, PlayDate, TimeSlotId)` bằng hai DbContext/UnitOfWork riêng, khẳng định chỉ một booking Held được tạo và request kia nhận `ConflictException`. Test tìm ngày ngẫu nhiên trong năm 2099, chỉ chạy khi có `SPORTHUB_TEST_CONNECTION`, và xóa booking do chính test tạo.
- Test mẫu rỗng `UnitTest1.cs` đã được gỡ để không làm số lượng test xanh gây hiểu nhầm.
- Browser smoke test ngày 2026-11-07 lúc 18:xx xác nhận slot 18:00–19:00 disabled, 19:00–20:00 còn mở; không tạo hold qua UI. Đồng hồ UI dùng múi giờ nghiệp vụ `Asia/Ho_Chi_Minh`, không phụ thuộc timezone máy người dùng. Test concurrency tạo booking fixture tạm thời trong SQL Server rồi dọn; sau test số booking không đổi (47), không còn BookingDetail của fixture năm 2099.
- Các lượt smoke/API/browser trước đó được ghi trong [bao-cao-tv1-booking.md](./bao-cao-tv1-booking.md).

## 10. Còn lại trong phạm vi TV1 / giai đoạn sau

1. Test UI thật ở ngày hiện tại: slot đã bắt đầu phải disabled; selection đang mở được bỏ khỏi giỏ khi slot bắt đầu; API vẫn từ chối slot quá giờ như lớp bảo vệ cuối.
2. Thêm test tự động cho hold nhiều giờ/rời giờ, giờ giữ hết hạn và các mốc hoàn hủy; hiện lượt này thêm test thanh toán/IPN/refund cùng với race/expiry test có sẵn.
3. Thiết lập `VNPay:HashSecret` bằng User Secrets/biến môi trường, cấu hình ReturnUrl/FrontendReturnUrl, đăng ký IpnUrl HTTPS public trong portal VNPay, rồi chạy giao dịch/refund Sandbox thật. Không commit HashSecret; rotate nếu giá trị trước đây là secret merchant thật.
4. Bổ sung cơ chế đối soát để chuyển refund `Processing` sang `Completed` khi có bằng chứng quyết toán; phản hồi accepted của API refund chưa chứng minh tiền đã về tài khoản.
5. Với API nhiều replica, bổ sung distributed lock/worker riêng để tránh nhiều bản `HoldSlotExpiryJob` quét cùng lúc.
