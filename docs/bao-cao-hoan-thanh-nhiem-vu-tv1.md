# Báo cáo hoàn thành nhiệm vụ TV1

## Kết luận

Nhiệm vụ cốt lõi của TV1 đã hoàn thành ở mức **đủ để kiểm thử end-to-end**:

- Xem availability theo cơ sở, môn và ngày.
- Khóa giờ trong quá khứ.
- Chọn một hoặc nhiều giờ liên tiếp trên giao diện.
- Giữ nhiều slot trong một booking.
- Kiểm tra xung đột booking, bảo trì, social session và tournament.
- Chống hai request đồng thời giữ cùng slot bằng transaction/locking.
- Tự giải phóng booking `Held` hết hạn sau thời gian giữ và grace period.
- Đồng bộ trạng thái slot qua SignalR.
- Thanh toán VNPay Sandbox: tạo URL, Return URL, IPN, kiểm tra chữ ký/số tiền và cập nhật booking đã thanh toán.
- Hủy booking và tính hoàn tiền theo chính sách 100%/50%/0%.
- Gửi yêu cầu refund VNPay, chống refund trùng và hiển thị thời gian dự kiến hoàn 1–3 ngày làm việc.
- UI booking có click-toggle, kéo chọn, giỏ hàng sticky/drawer và countdown.

## Trạng thái kiểm thử

- Người dùng đã kiểm thử thành công giao dịch VNPay Sandbox thực tế.
- API build: 0 warning, 0 error.
- Backend tests: 8 passed, 1 skipped.
- Test bị skip là concurrency SQL Server khi chưa cấu hình `SPORTHUB_TEST_CONNECTION`; test logic và các luồng IPN/refund chính đã có.

## Liên kết với thành viên khác trong code TV1

| Thành viên/module | Đã triển khai trực tiếp trong code TV1? | Nội dung đã liên kết | Còn thiếu hoặc cần thành viên phụ trách phối hợp |
|---|---|---|---|
| **TV2 — Auth** | ✅ Đã triển khai | Booking hold, thanh toán, xem lịch sử và hủy đơn dùng JWT, user ID và kiểm tra quyền sở hữu booking. | Cần TV2 duy trì contract JWT/role; không còn thiếu ở luồng booking chính. |
| **TV2 — Notification** | 🟡 Một phần | TV1 đã phát event `CourtSlotUpdated` qua SignalR cho availability, hold, thanh toán, hủy và expiry. | Notification cá nhân qua `NotificationHub`/CRM chưa được nối đầy đủ cho thanh toán, hủy hoặc nhắc lịch. |
| **TV3 — Facility/Court/Pricing** | ✅ Đã liên kết | Availability lấy sân, time slot, maintenance và giá từ backend; booking dùng `IPricingService`, không tự tính lại giá ở UI. | Một số API CRUD giá/cơ sở còn placeholder; cần TV3 hoàn thiện dữ liệu/policy nếu mở rộng production. |
| **TV3 — Voucher/Membership** | ❌ Chưa triển khai | Chưa truyền voucher vào request hold và chưa áp dụng giảm giá hạng thành viên trong tổng tiền booking. | Cần TV3 cung cấp policy/voucher contract; sau đó TV1 tích hợp vào hold, payment và lịch sử booking. |
| **TV4 — Social Session** | ✅ Đã liên kết | Repository availability kiểm tra social session đang mở và chặn slot giao thoa khi giữ sân. | Cần TV4 bảo đảm trạng thái/thời gian social session đúng để kiểm tra xung đột chính xác. |
| **TV4 — NoShow/Reputation** | ❌ Chưa triển khai trong flow TV1 | TV1 chưa gọi service trừ reputation khi no-show. | `NoShowScannerJob`, check-in log và `IReputationService` cần TV4 hoàn thiện/tích hợp. |
| **TV5 — Check-in/POS** | 🟡 Một phần | Booking đã `Confirmed` là nguồn dữ liệu cho check-in/POS; API booking/payment đã lưu trạng thái cần thiết. | Chưa nối đầy đủ chuyển trạng thái `InUse`, hoàn tất booking và đồng bộ reputation sau check-in; POS còn cần dùng dữ liệu động. |
| **TV5 — Report/đối soát** | ❌ Chưa triển khai | TV1 chỉ lưu payment/refund transaction và trạng thái `Processing`. | Cần TV5 xây báo cáo doanh thu và cơ chế đối soát refund để xác nhận tiền đã hoàn thực tế. |

## Giới hạn còn lại

- IPN production cần HTTPS public ổn định và được cấu hình đúng trên merchant VNPay.
- VNPay chấp nhận refund chưa chứng minh tiền đã về tài khoản; trạng thái có thể giữ `Processing` cho đến khi đối soát.
- `NoShowScannerJob`, notification cá nhân, voucher và một số báo cáo/module thành viên khác chưa thuộc phần lõi TV1.

**Đánh giá:** TV1 hoàn thành phần trách nhiệm chính; các mục còn lại là tích hợp liên module hoặc phụ thuộc cấu hình/vận hành của hệ thống bên ngoài.
