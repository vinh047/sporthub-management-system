# SPORT HUB — TV4 / TUẦN 8 — KIỂM THỬ TỔNG THỂ

**Phạm vi:** UC14/15/17 (Social Sessions + Vé), UC12/16 (Check-in + No-show), UC25/27 (trình độ + uy tín). Dựa trên các file TV4 Tuần 3–7. **Không chỉnh sửa dữ liệu hoặc schema trong gói này.**

## 1. Điều kiện đầu vào

- Nhánh TV4 đã tích hợp code Tuần 3–7, `dotnet build` và `pnpm build` không lỗi.
- SQL Server chạy; backend `http://localhost:5000`, frontend mặc định `http://localhost:5173` (nếu cổng khác phải thay).
- Cần tài khoản thật với các vai trò ADMIN, STAFF, PLAYER để kiểm thử có xác thực. Không chụp/đưa JWT lên báo cáo.
- Để kiểm thử đăng ký và hủy vé cần Facility + Court hợp lệ từ TV3 và Social Session do Admin/Staff quản lý; để kiểm thử thanh toán cần tích hợp TV5. Không chèn mẫu vào DB chung.
- Test làm thay đổi dữ liệu (POST/PUT/DELETE, check-in, rating) **chỉ chạy trên DB test riêng hoặc với dữ liệu test được nhóm thống nhất và có phương án phục hồi**.
- Chưa giả định mức phạt hủy sát giờ vì chưa có quy định chi tiết trong phân công.

## 2. Ma trận test case

| ID | Nghiệp vụ | Thao tác / dữ liệu | Kỳ vọng | Điều kiện |
|---|---|---|---|---|
| TV4-01 | Public list | GET /api/social-sessions | 200, JSON array (có thể []) | Ngay |
| TV4-02 | Public filter | GET /api/social-sessions?sportId=2 | 200, danh sách đúng bộ lọc khi có data | Cần data để xác thực bộ lọc |
| TV4-03 | Quyền quản lý | GET /api/social-sessions/manage khi chưa login | 401 | Ngay |
| TV4-04 | Quyền vé | GET /api/social-tickets/mine khi chưa login | 401 | Ngay |
| TV4-05 | Quyền điểm | GET /api/player-ratings/mine khi chưa login | 401 | Ngay |
| TV4-06 | Quyền check-in | GET /api/social-sessions/1/attendance chưa login | 401 | Ngay |
| TV4-07 | Tạo Social | Admin tạo buổi trên sân trống, giờ mở cửa | 201, buổi hiển thị | DB test + TV3 |
| TV4-08 | Kiểm tra sân | Tạo Social với court khác cơ sở/môn | Từ chối, không có bản ghi mới | DB test + TV3 |
| TV4-09 | Trùng lịch | Hai buổi cùng sân/giờ trùng nhau | Buổi sau bị từ chối | DB test + TV3 |
| TV4-10 | Sửa Social | PUT buổi chưa có người tham gia | Cập nhật thành công | DB test |
| TV4-11 | Hủy Social | DELETE buổi hợp lệ | Chuyển Cancelled, không còn public | DB test |
| TV4-12 | Quyền Staff | STAFF khác cơ sở thử quản lý Social | 403 hoặc lỗi quyền theo handler | DB test + TV3 |
| TV4-13 | Điều kiện uy tín | PLAYER uy tín <60 thử mua | Bị từ chối | DB test + TV2 |
| TV4-14 | Điều kiện trình độ | PLAYER ngoài min/max skill thử mua | Bị từ chối | DB test + TV2 |
| TV4-15 | Vé miễn phí | PLAYER mua buổi FeePerSlot=0 | Vé Confirmed, 1 slot giảm | DB test + TV3 |
| TV4-16 | Giữ vé có phí | PLAYER chọn phương thức đang hoạt động | PendingPayment, slot giữ trong 10 phút | DB test + TV3/TV5 |
| TV4-17 | Hết hạn giữ vé | Đợi tới hạn, job xử lý | Slot được trả về, không ghi đã thanh toán | DB test + TV5 |
| TV4-18 | Mua trùng | Cùng PLAYER đăng ký 2 lần cùng buổi | Lần 2 bị từ chối | DB test |
| TV4-19 | Không bán quá chỗ | Nhiều PLAYER tranh slot cuối cùng | Không vượt MaxParticipants | DB test + kiểm thử đồng thời |
| TV4-20 | Hủy sớm | Vé Confirmed, trước giờ chơi ít nhất 6h | Quote phản ánh hoàn 100% theo phương thức hỗ trợ | DB test + TV5 |
| TV4-21 | Hủy sát giờ | Vé Paid, còn dưới 6h | Chưa thực hiện khi thiếu chính sách phạt, không tự hoàn tiền | Chờ thống nhất nhóm |
| TV4-22 | Check-in đúng thời gian | Staff cùng cơ sở, vé Confirmed | Vé CheckedIn, không phạt | DB test + TV3 |
| TV4-23 | Check-in sai thời gian | Trước cửa sổ hoặc sau giờ kết thúc | Từ chối, không đổi trạng thái | DB test |
| TV4-24 | No-show | Vé Confirmed, quá giờ buổi chơi | NoShow, uy tín -20 (không âm), tăng lần vắng, 1 lịch sử | DB test |
| TV4-25 | Không phạt lặp | Chạy Job 2 lần cho 1 vé NoShow | Không trừ uy tín lần hai | DB test |
| TV4-26 | Không phạt vé hủy | Vé Cancelled hoặc CheckedIn sau giờ | Không bị tính NoShow | DB test |
| TV4-27 | Dashboard Player | GET /api/player-ratings/mine có token PLAYER | Điểm và lịch sử đúng user | Auth + DB |
| TV4-28 | Điểm giải đấu | Admin tính trận Completed có WinnerTeam | Ghi SkillRatingHistories và cập nhật PlayerProfile | DB test + TV5 |
| TV4-29 | Không tính điểm lặp | Gọi calculate lại cùng trận | Bị từ chối, lịch sử không nhân đôi | DB test |
| TV4-30 | Màn hình UI | Duyệt /social, /player/social-tickets, /player/rating, /admin/social | Không crash; loading/empty/error states rõ ràng | Ngay (sau khi login ở trang cần role) |

**Quy tắc kết luận:** PASS khi có kết quả thực tế và bằng chứng; BLOCKED khi thiếu dữ liệu từ TV3/TV5 hoặc thiếu tài khoản/quy định; NOT RUN nếu chưa chạy; FAIL nếu kết quả khác kỳ vọng. Không xem HTTP 401 chưa đăng nhập là bằng chứng API nghiệp vụ thành công.

## 3. Thực hiện theo thứ tự an toàn

1. Chạy unit tests (chỉ xử lý trong bộ nhớ): `dotnet test backend/SportHub.slnx --no-build`.
2. Chạy script read-only: `powershell -ExecutionPolicy Bypass -File .\scripts\Smoke-Test-TV4.ps1 -BaseUrl http://localhost:5000`.
3. Kiểm tra giao diện trên web, tab Network và Console.
4. Nếu có môi trường test riêng, xin dữ liệu/tài khoản từ TV2, TV3, TV5 rồi chạy các ca nghiệp vụ có ghi dữ liệu.
5. Kiểm tra cạnh tranh đặt slot, idempotency tính điểm, job No-show bằng ít nhất 2 request/luồng riêng. Chụp kết quả trước/sau để đối chiếu, không chạy trên DB chung khi chưa được đồng ý.

## 4. Rủi ro cần bàn giao (chưa khẳng định đã lỗi)

- NuGet `NU1902/NU1903` và cảnh báo decimal precision cần phối hợp nâng cấp/config trước triển khai production.
- Giữ slot 10 phút, cửa sổ check-in 30 phút, quét sau giờ kết thúc là đề xuất; cần xác nhận quy định với nhóm.
- Chưa có thanh toán hoàn chỉnh và hoàn tiền thực tế từ TV5, không đánh dấu E2E thanh toán PASS.
- Rating là Elo-style heuristic, không phải DUPR chính thức. Cần kiểm tra transaction đồng thời và chống xử lý lặp ở mức database/app.
- `ReputationHistories` và `SkillRatingHistories` phải có tính nhất quán với PlayerProfile khi xử lý concurrent.
- Dữ liệu Facility/Court từ TV3 hiện từng trả về `[]`; không tự sinh mẫu trong môi trường chung.

## 5. Bằng chứng nên lưu

- Build + tổng kết unit test, script smoke + các HTTP status; ảnh UI không có lỗi Console.
- Network tab cho 401 unauthenticated và 200 authorized.
- Ảnh trước/sau AvailableSlots khi mua/hủy, trước/sau ReputationScore và History, trước/sau Rating và lịch sử, chỉ khi có DB test.
- Che token và dữ liệu cá nhân trong mọi ảnh chụp.
