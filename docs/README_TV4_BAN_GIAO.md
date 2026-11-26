# SPORTHUB MANAGEMENT SYSTEM — BÀN GIAO PHÂN HỆ TV4

> **Social Sessions · Social Tickets · Check-in / No-show · Skill Rating · Reputation**  
> **Phạm vi thực hiện:** Tuần 3–8 | **Use cases:** UC12, UC14, UC15, UC16, UC17, UC25, UC27  
> **Nhánh triển khai:** `feature/tv4-social` (xác nhận lại trước khi merge)  
> **Đối tượng đọc:** thành viên nhận bàn giao, người tích hợp Backend/Frontend, người kiểm thử và người bảo trì.  
> **Nguyên tắc:** tài liệu mô tả **mã nguồn đã viết và các kết quả kiểm chứng đã được báo cáo**. Các luồng chưa có dữ liệu hoặc chưa tích hợp bên ngoài được ghi rõ; không xem việc build thành công là đã hoàn tất E2E.

---

## 1. Tổng quan và trách nhiệm

TV4 phụ trách phân hệ **Trận đấu Social** (tạo buổi chơi, bán/giữ slot, vé, hủy vé, check-in), **điểm uy tín và phạt No-show**, và **hiệu chỉnh trình độ người chơi** dựa trên kết quả trận đấu. Đây là phần công việc được xác định trong `phancong_updated.xlsx`.

| Use case | Nội dung bàn giao | Thành phần chính |
|---|---|---|
| UC14, UC15 | Khởi tạo/quản lý buổi Social, lọc danh sách, xem chi tiết, đăng ký slot | SocialSessions, SocialSessionCourts, SocialParticipants |
| UC17 | Xem điều kiện hủy, hủy vé và xử lý hoàn tiền ở phạm vi hỗ trợ | SocialTickets, PaymentTransactions |
| UC12, UC16 | Nhân viên check-in và xử lý trường hợp không đến sân | SocialAttendance, NoShowScannerJob |
| UC25, UC27 | Cập nhật trình độ, lưu lịch sử rating; xem điểm và lịch sử uy tín | PlayerProfiles, SkillRatingHistories, ReputationHistories |

**Ngoài phạm vi sở hữu TV4:** Booking sân, khóa slot sân và SignalR của TV1; JWT, user, role và hồ sơ Player của TV2; Facility, Court, giá, voucher, bảo trì của TV3; cổng thanh toán, giải đấu, nhập tỷ số và POS của TV5. TV4 **tích hợp** dữ liệu/hợp đồng của các phân hệ này, không tự triển khai lại chức năng thuộc họ.

### 1.1. Công nghệ và mô hình

- **Backend:** .NET 10, ASP.NET Core Web API, Entity Framework Core, SQL Server, Clean Architecture (API → Application/Domain → Infrastructure).
- **Frontend:** React + TypeScript + Vite + Tailwind CSS; dùng Axios/JWT và cơ chế đăng nhập, layout, routing sẵn có của nhóm.
- **Phân quyền:** role `ADMIN`, `STAFF`, `PLAYER` qua JWT; Staff bị giới hạn theo `ManagedFacilityId` đối với chức năng quản lý buổi/check-in.
- **Background processing:** `NoShowScannerJob` chạy định kỳ; xử lý giữ slot/hết hạn có logic riêng của vé Social.
- **Lưu ý:** mã tính điểm là **Elo-style heuristic**, không phải API DUPR chính thức hay AI/ML đã huấn luyện.

## 2. Tiến trình triển khai Tuần 3–8

| Tuần | Nội dung đã xây dựng | Mốc kiểm tra/ghi chú |
|---|---|---|
| **3** | Backend Social CRUD, lọc môn/cơ sở/trình độ/ngày, quản lý sân tham gia, kiểm tra trùng lịch, phân quyền | Backend đã build; GET `/api/social-sessions` trả `200 []`; POST/PUT/DELETE chưa được kiểm thử với Facility/Court thực tế |
| **4** | Frontend danh sách/chi tiết Social, bộ lọc, quản lý Admin/Staff, form chọn nhiều sân, loading/empty/error state | Đã tích hợp theo xác nhận của người thực hiện; luồng có dữ liệu thật còn phụ thuộc TV3 |
| **5** | Backend mua/giữ slot, kiểm tra uy tín/trình độ, vé miễn phí/có phí, hủy vé; Frontend vé của tôi, đăng ký, đếm ngược, xem hủy; bổ sung đọc phương thức thanh toán | `dotnet build` thành công; 1/1 test lúc đó PASS; 2 API không JWT trả 401; thu/hoàn tiền thực tế cần TV5 |
| **6** | API và UI nhân viên check-in, `NoShowScannerJob` trừ điểm và lưu lịch sử, unit test chính sách | Người thực hiện xác nhận đã tích hợp; cần kiểm thử có dữ liệu thật và tình huống chạy đồng thời |
| **7** | Rating từ kết quả trận đấu hoàn tất, lịch sử biến động rating/uy tín và UI Player, unit test công thức | Người thực hiện xác nhận đã tích hợp; chưa có minh chứng chạy E2E cập nhật rating với dữ liệu giải đấu thực |
| **8** | Test hồi quy/boundary, kế hoạch 30 ca, script smoke API read-only, biểu mẫu báo cáo | **Bộ kiểm thử đã chuẩn bị; chưa nhận được kết quả chạy Tuần 8 để kết luận PASS** |

**Quy ước trạng thái khi bàn giao:** “đã viết/đã tích hợp” khác “đã kiểm thử nghiệp vụ”; “BLOCKED” nghĩa là chưa đủ dữ liệu hoặc phụ thuộc phân hệ, **không đồng nghĩa FAIL**.

## 3. Cấu trúc mã nguồn và trách nhiệm từng lớp

> Đường dẫn dưới đây tính từ thư mục gốc `sporthub-management-system/`. Danh sách phản ánh các bộ mã TV4 Tuần 3–8; trước khi bàn giao chính thức hãy đối chiếu `git diff` với nhánh hiện tại sau khi nhóm merge.

```text
backend/
├── src/
│   ├── SportHub.API/Controllers/
│   │   ├── SocialSessionsController.cs          # CRUD/search buổi Social
│   │   ├── SocialTicketsController.cs           # mua vé, vé của tôi, hủy, payment methods
│   │   ├── SocialAttendanceController.cs        # danh sách và xác nhận check-in
│   │   └── PlayerRatingsController.cs           # dashboard Player, tính rating trận đấu
│   ├── SportHub.Application/
│   │   ├── DTOs/Social/                           # Social DTO, Ticket DTO, Attendance DTO
│   │   ├── DTOs/Player/PlayerRatingDtos.cs
│   │   ├── Interfaces/Repositories/              # ISocialSessionRepository, ISocialTicketRepository
│   │   ├── Interfaces/Services/                  # ISocialSessionService, ISocialTicketService,
│   │   │                                         # ISocialAttendanceService, IPlayerRatingService
│   │   ├── Services/
│   │   │   ├── SocialSessionService.cs
│   │   │   ├── SocialTicketService.cs
│   │   │   ├── SocialTicketPolicy.cs
│   │   │   ├── SocialAttendancePolicy.cs
│   │   │   └── SkillRatingPolicy.cs
│   │   └── DependencyInjection.cs
│   └── SportHub.Infrastructure/
│       ├── Persistence/Repositories/
│       │   ├── SocialSessionRepository.cs
│       │   ├── SocialTicketRepository.cs
│       │   ├── SocialAttendanceService.cs
│       │   └── PlayerRatingService.cs
│       ├── BackgroundJobs/NoShowScannerJob.cs
│       └── DependencyInjection.cs
└── tests/SportHub.Tests/
    ├── SocialAttendancePolicyTests.cs
    ├── SkillRatingPolicyTests.cs
    ├── SocialTicketPolicyRegressionTests.cs
    └── SocialWeek8BoundaryTests.cs

frontend/src/
├── api/
│   ├── socialApi.ts
│   ├── socialTicketApi.ts
│   ├── socialAttendanceApi.ts
│   └── playerRatingApi.ts
├── components/social/
│   ├── SocialShared.tsx
│   ├── SocialReservePanel.tsx
│   └── SocialAttendancePanel.tsx
├── page/user/
│   ├── SocialSessionsPage.tsx
│   ├── SocialSessionDetailPage.tsx
│   ├── SocialTicketsPage.tsx
│   └── PlayerRatingPage.tsx
├── page/admin/SocialManagePage.tsx
├── App.tsx                         # thêm các route Social/rating
└── layouts/                       # liên kết menu Player, Admin/Staff

scripts/Smoke-Test-TV4.ps1          # kiểm tra nhanh, không ghi dữ liệu
docs/KE_HOACH_KIEM_THU_TV4_TUAN8.md
docs/BAO_CAO_KET_QUA_TV4_TUAN8.md
```

**Vị trí mở rộng hợp lý:** API/Controller định nghĩa endpoint và role; service xử lý nghiệp vụ; repository truy vấn/cập nhật DB; `Policy` lưu quy tắc có thể unit test; React API client gọi endpoint; page/component hiển thị và xử lý trạng thái. Tránh đưa logic kiểm tra uy tín, giá hoặc check-in **chỉ** vào Frontend.

## 4. Các màn hình và luồng sử dụng

| Vai trò | Route mặc định | Chức năng |
|---|---|---|
| Public | `/social` | Danh sách buổi Social và bộ lọc |
| Player | `/player/social` | Danh sách buổi chơi |
| Public/Player | Đường dẫn chi tiết khai báo trong `App.tsx` | Xem buổi, sân, giá, slot, điều kiện; nút mua cho Player |
| Player | `/player/social-tickets` | Vé của tôi, trạng thái, thời gian giữ chỗ, yêu cầu hủy |
| Player | `/player/rating` | Điểm trình độ/uy tín, lịch sử thay đổi |
| Admin | `/admin/social` | Quản lý buổi, tạo/sửa/hủy, danh sách check-in |
| Staff | `/staff/social` | Tương tự Admin nhưng giới hạn cơ sở phụ trách |

> Ví dụ frontend chạy tại `http://localhost:5173`; Vite có thể chọn cổng khác nếu cổng mặc định bận. Đường dẫn chi tiết buổi chơi cần lấy chính xác từ `frontend/src/App.tsx` đang triển khai.

**Hành vi không có dữ liệu:** khi GET `/api/facility` trả `data: []` hoặc GET Social trả `[]`, UI hiển thị trạng thái trống/cảnh báo; **không** tự khởi tạo cơ sở, sân, vé hoặc giao dịch giả trong DB chung.

## 5. API Backend — hợp đồng tích hợp

**Base URL local đã kiểm chứng:** `http://localhost:5000` (profile `http` trong `backend/src/SportHub.API/Properties/launchSettings.json`). Kết nối API qua Axios hiện có; với endpoint bảo vệ cần `Authorization: Bearer <JWT>`.

### 5.1. Social Sessions (Tuần 3–4)

| Method | Đường dẫn | Role | Ý nghĩa |
|---|---|---|---|
| `GET` | `/api/social-sessions` | Public | Danh sách; query `sportId`, `facilityId`, `date`, `minSkill`, `maxSkill` |
| `GET` | `/api/social-sessions/facility/{facilityId}` | Public | Danh sách theo cơ sở và ngày tùy chọn |
| `GET` | `/api/social-sessions/{id}` | Public cho buổi Published; quản lý với buổi khác | Chi tiết |
| `GET` | `/api/social-sessions/manage` | ADMIN, STAFF | Danh sách quản trị đúng phạm vi |
| `POST` | `/api/social-sessions` | ADMIN, STAFF | Tạo buổi |
| `PUT` | `/api/social-sessions/{id}` | ADMIN, STAFF | Cập nhật buổi |
| `DELETE` | `/api/social-sessions/{id}` | ADMIN, STAFF | Hủy mềm: `Status = Cancelled` |

**Các trường đầu vào chính:** `facilityId`, `sportId`, `title`, `playDate` (`YYYY-MM-DD`), `startTime`, `endTime`, `maxParticipants`, `feePerSlot`, `minSkill`, `maxSkill`, `description`, `courtIds` (danh sách ID sân). Bắt buộc lấy ID thực từ TV3.

**Quy tắc quan trọng:** Staff chỉ quản lý cơ sở được phân công; sân phải hoạt động và thuộc đúng cơ sở/môn; giờ chơi trong giờ cơ sở hoạt động; không trùng giờ Booking, bảo trì, Social; phiên làm việc phải ở tương lai; thao tác tạo/sửa/hủy có transaction. Hủy/sửa buổi đã có người tham gia chưa được xử lý hoàn tiền ở cấp buổi — cần giải quyết vé trước.

### 5.2. Social Tickets (Tuần 5)

| Method | Đường dẫn | Role | Ý nghĩa |
|---|---|---|---|
| `GET` | `/api/social-tickets/payment-methods` | PLAYER | Phương thức thanh toán online đang hoạt động |
| `POST` | `/api/social-tickets/reserve/{sessionId}` | PLAYER | Đăng ký/giữ slot |
| `GET` | `/api/social-tickets/mine` | PLAYER | Vé của người dùng đăng nhập |
| `GET` | `/api/social-tickets/{id}/cancellation-quote` | PLAYER/chủ vé | Số tiền dự kiến hoàn và điều kiện hủy |
| `POST` | `/api/social-tickets/{id}/cancel` | PLAYER/chủ vé | Hủy vé hợp lệ |

**Body đăng ký:** `{ "paymentMethodId": null }` với vé miễn phí hoặc ID phương thức thanh toán online hợp lệ đối với vé có phí (kiểm tra chính xác DTO đang triển khai nếu cập nhật).

**Điều kiện:** user đang hoạt động, có role PLAYER và PlayerProfile; `ReputationScore >= 60`; `NumericSkillRating` trong `[MinSkill, MaxSkill]`; buổi `Published` chưa bắt đầu; không đăng ký trùng; không vượt `MaxParticipants`. Vé miễn phí thành `Confirmed`. Vé có phí thành `PendingPayment`, tạo `PaymentTransaction` trạng thái Pending, giữ chỗ **10 phút** (tham số đề xuất). Transaction được dùng để hạn chế overselling; vẫn cần kiểm thử cạnh tranh đồng thời trên SQL Server.

**Kết thúc thanh toán:** `ISocialTicketService.ConfirmPaidAsync(transactionId, verifiedAmount, referenceCode)` chỉ cho **adapter máy chủ đáng tin cậy của TV5** gọi sau xác minh thực tế; không cung cấp API để Player tự xác nhận trả tiền. Cần đối soát trạng thái và số tiền trước khi chuyển `Confirmed`.

**Hủy:** hủy hold chưa trả tiền; vé đã xác nhận và hủy sớm (trước giờ bắt đầu **ít nhất 6 giờ**) có nguyên tắc hoàn 100%. Bản hiện tại chỉ cập nhật trạng thái hoàn tiền trên sổ giả lập `MOCK_ONLINE`; hoàn tiền qua gateway thực phải do TV5 tích hợp. Hủy sát giờ đã trả tiền **chưa tự áp phạt** vì quy định mức cọc/phạt uy tín chưa được chốt; hệ thống từ chối thao tác thay vì trừ tùy tiện.

### 5.3. Check-in / No-show (Tuần 6)

| Method | Đường dẫn | Role | Ý nghĩa |
|---|---|---|---|
| `GET` | `/api/social-sessions/{sessionId}/attendance` | ADMIN, STAFF | Danh sách người tham gia |
| `POST` | `/api/social-sessions/{sessionId}/attendance/{ticketId}/check-in` | ADMIN, STAFF | Xác nhận có mặt |

Chỉ vé `Confirmed` trong buổi `Published` hoặc `InProgress` mới có thể check-in; Staff bị giới hạn theo Facility. Khung thời gian đề xuất: **từ 30 phút trước giờ bắt đầu đến trước giờ kết thúc** (quy đổi giờ Việt Nam UTC+7). Check-in chuyển trạng thái thành `CheckedIn`.

`NoShowScannerJob` quét định kỳ **mỗi phút**, xử lý vé `Confirmed` chưa check-in sau khi kết thúc buổi: `Status = NoShow`, `ReputationScore = max(0, old - 20)`, tăng `TotalNoShows`, thêm bản ghi `ReputationHistories`. Dùng transaction và kiểm tra lại trạng thái để tránh xử phạt lặp. Không áp dụng phạt cho vé đã Cancelled/Expired/CheckedIn. Các quy tắc thời gian/phạt đặt trong `SocialAttendancePolicy.cs`.

> `NoShowScannerJob.cs` còn phần TODO tham chiếu nghiệp vụ Booking của TV1; phần **Social** là phạm vi đã bổ sung của TV4. Không hiểu nhầm TODO này là nghiệp vụ Social chưa được triển khai. Tương tự, code không tự khóa tài khoản theo ngưỡng uy tín 50; đó không phải quy tắc TV4 đã chốt.

### 5.4. Skill Rating và Reputation (Tuần 7)

| Method | Đường dẫn | Role | Ý nghĩa |
|---|---|---|---|
| `GET` | `/api/player-ratings/mine` | PLAYER | Rating, cấp độ, số trận, uy tín và lịch sử |
| `POST` | `/api/player-ratings/tournament-matches/{matchId}/calculate` | ADMIN | Tính rating từ kết quả trận đã Completed |

**Dữ liệu đầu vào:** `TournamentMatch`, `TournamentTeam`, `TournamentAthlete`, `PlayerProfiles` của các module đã có; chỉ tính khi có đội thắng hợp lệ, không đoán tỉ số/trận. **Kết quả ghi:** `NumericSkillRating`, `SkillLevel`, `TotalMatchesPlayed` và `SkillRatingHistories` chứa điểm cũ/mới, delta, trận liên quan, lý do. Tránh tính lại trận đã có lịch sử ghi rating.

**Công thức Elo-style trên thang 1–5:**

```text
Expected = 1 / (1 + 10 ^ (OpponentTeamAverage - OwnRating))
NewRating = clamp(round(OwnRating + 0.16 * (Result - Expected), 2), 1.00, 5.00)
Result = 1 nếu thắng, 0 nếu thua
```

Cấp độ đang gán: `Beginner` <2.00; `Intermediate` 2.00–<3.50; `Advanced` 3.50–<4.50; `Pro` ≥4.50. Đây là **heuristic đang lập trình**; chưa tính delta theo biên độ tỷ số từng set như mục tiêu trong bảng phân công Tuần 7, cũng chưa phải hệ thống DUPR chính thức. Cần thảo luận với nhóm nếu SRS bắt buộc tính theo điểm từng set.

**Giới hạn quan trọng:** bảng Social Sessions hiện không có luồng lưu kết quả thắng/thua của buổi Social; rating hiện được kích hoạt từ **trận giải đấu hoàn tất**, không tự động sau mọi buổi Social. Không mô tả tính năng “Social kết thúc → tự tăng/giảm rank” là đã hoàn tất.

## 6. Trạng thái dữ liệu, quy tắc và quyền truy cập

### 6.1. Trạng thái tham khảo

| Đối tượng | Giá trị đã dùng trong code | Ý nghĩa |
|---|---|---|
| SocialSession | `Published`, `Cancelled`; service attendance còn kiểm tra `InProgress`, `Completed` | Trạng thái công khai/hủy và vòng đời buổi |
| SocialParticipant | `PendingPayment`, `Confirmed`, `CheckedIn`, `NoShow`, `Cancelled`; DTO hiển thị `Expired` cho hold quá hạn | Trạng thái vé |
| PaymentTransaction | `Pending`, `Confirmed`, `Failed`, `Refunded` | Theo `PaymentStatus` của dự án |

**Slot còn lại:** `MaxParticipants − (vé Confirmed + CheckedIn + hold PendingPayment còn hạn)`, không cho âm; vé hủy và hold hết hạn không chiếm slot. `HeldCount` trong DTO giúp Frontend hiển thị số chỗ có thể bán.

### 6.2. Ma trận phân quyền

| Thao tác | Public | PLAYER | STAFF | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Xem danh sách/chi tiết buổi Published | ✓ | ✓ | ✓ | ✓ |
| Mua vé/xem vé của chính mình/hủy vé | — | ✓ | — | — |
| Tạo, sửa, hủy buổi Social | — | — | ✓ theo cơ sở | ✓ |
| Xem danh sách người chơi và check-in | — | — | ✓ theo cơ sở | ✓ |
| Xem lịch sử rating của chính mình | — | ✓ | — | — |
| Kích hoạt tính rating từ trận hoàn tất | — | — | — | ✓ |

**401** = chưa/không cung cấp JWT hợp lệ; **403** = xác thực được nhưng thiếu quyền; **404** = tài nguyên không có/không được phép thấy; **409** = xung đột lịch/trạng thái; **400** = đầu vào không hợp lệ (mã cụ thể do exception middleware hiện tại quyết định).

## 7. CSDL và hợp đồng dữ liệu với các nhóm khác

| Bảng/Entity | Vai trò của TV4 | Phụ thuộc |
|---|---|---|
| `SocialSessions` | Thông tin buổi, thời gian, môn/cơ sở, số slot, giá, giới hạn skill | Facility/Sport TV3 |
| `SocialSessionCourts` | Ghép buổi với sân con | Court/Booking/Bảo trì TV1–TV3 |
| `SocialParticipants` | Vé, người tham gia, trạng thái, thời điểm đăng ký và số tiền đã trả | User/Player TV2; Payment TV5 |
| `PlayerProfiles` | Đọc rating/uy tín khi mua, cập nhật uy tín khi No-show, cập nhật rating sau trận | Chủ sở hữu hồ sơ TV2 |
| `SkillRatingHistories` | Lịch sử delta theo trận | Kết quả giải đấu TV5 |
| `ReputationHistories` | Lịch sử điểm bị trừ do vắng mặt | User/Player TV2 |
| `PaymentTransactions`, `PaymentMethods` | Tạo pending/đọc phương thức, đối soát và hoàn tiền mock | Thu/hoàn tiền thật TV5 |
| `TournamentMatches`, `TournamentTeams`, `TournamentAthletes` | **Đọc** kết quả đã xác nhận để tính điểm | Dữ liệu giải đấu TV5 |

**Không tự chạy migration mới:** các gói TV4 Tuần 3–8 đã được cung cấp không kèm migration/schema mới. Nếu nhánh của nhóm thay đổi Entity, cần so sánh schema và cấu hình EF Core trước khi chạy migration của cả hệ thống.

## 8. Cài đặt, khởi động và xác minh môi trường

### 8.1. Yêu cầu

- Windows PowerShell/Terminal, .NET SDK 10, Node.js cùng pnpm đúng phiên bản yêu cầu trong dự án, Docker Desktop/SQL Server theo `docker-compose` và cấu hình `.env` hợp lệ.
- Dùng **cấu hình secrets của nhóm**, tuyệt đối không đưa mật khẩu SQL, JWT signing key hoặc access token vào README/commit.
- Chạy lệnh từ **thư mục gốc** `sporthub-management-system` trừ khi có `cd`.

### 8.2. Lệnh chuẩn

```powershell
# 1) Xác minh nhánh và các file thay đổi
git branch --show-current
git status --short

# 2) Database: kiểm tra Docker trước
docker compose ps
# Nếu chưa chạy và script của dự án vẫn tồn tại:
pnpm db:up

# 3) Build + test Backend
dotnet build backend/SportHub.slnx
dotnet test backend/SportHub.slnx --no-build

# 4) Chạy Backend (Terminal 1)
dotnet run --project backend/src/SportHub.API

# 5) Chạy Frontend (Terminal 2)
cd frontend
pnpm install
pnpm build
pnpm dev
```

**URL local:** Backend profile `http` thường là `http://localhost:5000`; Frontend mặc định `http://localhost:5173`. Nếu khác, xem dòng `Now listening on:` của Kestrel hoặc URL thực do Vite hiển thị. Chú ý `launchSettings.json` có profile HTTPS riêng `https://localhost:5001`.

### 8.3. Smoke test **không thay đổi dữ liệu**

```powershell
# Từ thư mục gốc, giữ API chạy sẵn
powershell -ExecutionPolicy Bypass -File .\scripts\Smoke-Test-TV4.ps1 -BaseUrl http://localhost:5000

# Kiểm tra thủ công không cần JWT
curl.exe -i http://localhost:5000/api/social-sessions
curl.exe -i http://localhost:5000/api/social-tickets/mine
curl.exe -i http://localhost:5000/api/player-ratings/mine
```

Expected: danh sách Social có thể `200 []`; các API chỉ dành cho Player/Admin/Staff thường trả `401` nếu **không** mang JWT. `401` **không chứng minh** mua vé, check-in, hoàn tiền hay rating thực tế đã đúng. Tránh chạy POST thay đổi dữ liệu vào DB chung.

### 8.4. Ví dụ đầu vào tạo buổi (chỉ dùng **DB test riêng** khi có dữ liệu TV3)

```json
{
  "facilityId": 1,
  "sportId": 2,
  "title": "Giao lưu Pickleball",
  "playDate": "2026-12-05",
  "startTime": "08:00:00",
  "endTime": "10:00:00",
  "maxParticipants": 12,
  "feePerSlot": 80000,
  "minSkill": 1.5,
  "maxSkill": 4.0,
  "description": "Buổi chơi kiểm thử",
  "courtIds": [1]
}
```

**Chỉ minh họa cấu trúc payload, KHÔNG mặc định các ID tồn tại hoặc sân trống.** Đổi ngày giờ sang tương lai, xác minh Facility/Court/Sport/giờ hoạt động và JWT Admin/Staff trước khi thực thi.

## 9. Kiểm thử, nghiệm thu và minh chứng

### 9.1. Những bằng chứng **đã có từ trao đổi triển khai**

- Backend Tuần 3: `dotnet build backend/SportHub.slnx` thành công; GET `/api/social-sessions` trả `200 []`, GET bộ lọc trả `200 []`.
- Backend Tuần 5: build thành công với **18 warnings**, **0 lỗi biên dịch**; `dotnet test` **1 passed/1 total** tại thời điểm đó; API chạy, các job được khởi động trong log.
- `/api/social-tickets/mine` và `POST /api/social-tickets/reserve/1` khi không có JWT đều trả `401` cùng `WWW-Authenticate: Bearer`.
- Người thực hiện báo đã tích hợp các bộ code Tuần 4, 5 (Frontend), 6, 7, nhưng **chưa lưu log kiểm thử đầy đủ tương ứng ở tài liệu hiện có**.
- Kết quả kiểm thử Tuần 8 **chưa được cung cấp**; tài liệu báo cáo Tuần 8 trước đó là **biểu mẫu**, không phải biên bản PASS.

### 9.2. Cách thực hiện kiểm thử Tuần 8

1. Lưu snapshot/commit đang test, phiên bản Backend/Frontend, DB và tài khoản vai trò **không kèm secret**.
2. Chạy `dotnet build`, `dotnet test`, `pnpm build`; lưu log và ảnh kiểm chứng.
3. Chạy `scripts/Smoke-Test-TV4.ps1` (8 API read-only); đối chiếu HTTP status.
4. Trên DB test riêng: kiểm thử CRUD/bộ lọc/trùng lịch với Facility và Court thực tế của TV3.
5. Kiểm thử mua vé miễn phí; vé có phí + PendingPayment chỉ khi TV5 có phương thức thanh toán và adapter xác minh; kiểm thử giới hạn chỗ, giữ slot hết hạn, chống đăng ký trùng.
6. Kiểm thử hủy sớm 6h, hủy sát giờ (chờ chính sách), check-in đúng/sai thời gian, No-show -20 và không phạt lặp.
7. Kiểm thử rating trên một trận đấu có kết quả thực từ TV5, xác minh thay đổi profile/history và chặn gọi tính lần hai.
8. Kiểm tra UI Player/Admin/Staff, DevTools Network/Console, phân quyền 401/403, loading/empty/error state.
9. Ghi kết quả **từng case** vào `docs/BAO_CAO_KET_QUA_TV4_TUAN8.md`: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`; liên kết ảnh/log và commit.

**Bộ test hiện có:** `SocialAttendancePolicyTests`, `SkillRatingPolicyTests`, `SocialTicketPolicyRegressionTests`, `SocialWeek8BoundaryTests` và các test có sẵn của nhóm. Danh mục 30 ca nghiệm thu ở `docs/KE_HOACH_KIEM_THU_TV4_TUAN8.md`; **không lấy số lượng ca trong kế hoạch làm số test tự động đã pass**.

### 9.3. Tiêu chí nghiệm thu tối thiểu

- Build Backend/Frontend thành công, các unit test liên quan PASS; không phá luồng Auth, Facility, Booking, Tournament.
- Các API public đúng dữ liệu; JWT/role/facility scope được kiểm tra bằng tài khoản của từng vai trò.
- Không bán vượt số slot, không cho mua khi uy tín hoặc trình độ không đạt; không làm mất giao dịch đã được xác nhận.
- Check-in và No-show chuyển trạng thái đúng và không phạt trùng; lịch sử uy tín/rating đúng.
- Các kết quả thanh toán thật, hoàn tiền và cập nhật rank sau kết quả Social **không được đánh dấu đạt** khi chưa có tích hợp và bằng chứng.

## 10. Những phần còn mở / rủi ro cần bàn giao rõ

| Mã | Hạng mục | Tình trạng/ảnh hưởng | Chủ trì phối hợp |
|---|---|---|---|
| DEP-01 | Chưa có Facility/Court hoạt động khi kiểm thử ban đầu (`/api/facility`: `data: []`) | Chưa kiểm thử CRUD Social với sân thật, trùng lịch và full E2E | TV3 + TV4 |
| DEP-02 | PaymentTransactions/Mock VietQR/đối soát và hoàn tiền | Có Pending và điểm tích hợp `ConfirmPaidAsync`; thanh toán/hoàn tiền thật chưa được xác minh | TV5 + TV4 |
| DEP-03 | Hủy sát giờ (<6h) | Mức phạt cọc và điểm uy tín chưa được chốt; service hiện từ chối thay vì tự phạt | Nhóm/SRS + TV4/TV5 |
| DEP-04 | Rating từ trận Social | Buổi Social chưa có cấu trúc kết quả thắng/thua; rating hiện dựa trên TournamentMatch Completed | TV4 + TV5 |
| DEP-05 | Công thức rating theo biên độ tỷ số set | Yêu cầu kế hoạch nêu biên độ tỷ số; triển khai là Elo-style win/loss, K=0.16 | TV4 + nhóm/SRS |
| DEP-06 | Thời gian giữ slot 10 phút, check-in -30 phút → hết buổi | Là tham số đề xuất, cần xác nhận nghiệp vụ | Nhóm + TV4 |
| DEP-07 | Chống race condition/chạy job đồng thời | Có transaction; cần load test/parallel test và xác minh lock trên DB thật | TV4 + TV1 |
| DEP-08 | `NoShowScannerJob` còn TODO về Booking | TODO này thuộc phạm vi Booking TV1, không phải phần quét Social | TV1 |
| DEP-09 | Lỗ hổng NuGet `NU1902/NU1903` | Cần kiểm tra nâng cấp SignalR.Common và System.Security.Cryptography.Pkcs trước production | Trưởng nhóm/Backend |
| DEP-10 | Cảnh báo EF decimal precision | Cần cấu hình precision cho các trường tiền/rating, đặc biệt PaymentTransaction và SkillRatingHistory; phối hợp chủ sở hữu schema | Trưởng nhóm + TV4/TV5 |
| DEP-11 | Minh chứng E2E Tuần 8 | Chưa có kết quả tất cả ca; không thể đóng nghiệm thu | TV4 + các thành viên |

**Quan trọng:** không tự chạy thao tác xóa dữ liệu để “dọn mẫu” trong DB chung; chạy E2E dữ liệu thay đổi trên DB test riêng hoặc dùng dữ liệu đã được nhóm phê duyệt.

## 11. Hướng dẫn khắc phục sự cố thường gặp

| Triệu chứng | Nguyên nhân cần kiểm tra | Cách xử lý |
|---|---|---|
| Build .NET thất bại vì DLL bị khóa | API cũ vẫn chạy | `Ctrl+C` Terminal API rồi build lại; không tùy tiện xóa output khi process đang dùng |
| `401 Unauthorized` ở `/manage`, `/mine`, `/attendance` | Không JWT/hết hạn JWT | Đăng nhập role phù hợp; lấy token qua luồng auth, không chia sẻ token |
| `403 Forbidden` | Role hoặc Facility scope sai | Kiểm tra role trên JWT/UserRole và `StaffProfiles.ManagedFacilityId` |
| `200 []` Social hoặc Facility | Chưa có buổi `Published`/cơ sở active hoặc bộ lọc chưa khớp | Kiểm tra dữ liệu API, không suy đoán lỗi kết nối |
| POST Social bị 400/409 | Sân không thuộc môn/cơ sở, giờ ngoài open hours, trùng Booking/Social/bảo trì hoặc buổi đã bắt đầu | Đọc response và log, đối chiếu dữ liệu thực tế TV3 |
| Không thể mua slot | Uy tín <60, rating ngoài khoảng, hết slot, giữ chỗ trùng, buổi chưa/không Published | Kiểm tra profile/session/hold theo quy tắc service |
| Vé giữ chỗ không được xác nhận | TV5 chưa gọi trusted `ConfirmPaidAsync`, phương thức chưa active, hết hạn hold | Kiểm tra giao dịch DB và nhật ký đối soát; không tự sửa trạng thái vé thành Confirmed |
| Hủy vé đã trả tiền bị từ chối | <6h, thanh toán thực chưa hỗ trợ refund hoặc vé không đúng trạng thái | Đọc `cancellation-quote`; chốt policy với TV5/nhóm |
| Không ghi No-show | Job không chạy, vé không Confirmed, buổi chưa kết thúc hoặc lỗi DB | Kiểm tra log `NoShowScannerJob` và `ReputationHistories`; tránh chạy phạt thủ công trên DB chung |
| Không có thay đổi rating | Trận chưa Completed, thiếu WinnerTeamId/đội tham gia, trận đã tính | Kiểm tra dữ liệu TV5 và `SkillRatingHistories` |
| Frontend lỗi build | Package/types thiếu, route/App.tsx xung đột khi merge | `pnpm install`, `pnpm build`, xem lỗi TypeScript đúng file; đối chiếu với nhánh chính |

## 12. Quy trình nhận bàn giao và tiếp tục phát triển

### 12.1. Checklist cho người nhận

- [ ] Xác định commit/branch chính xác và so sánh source TV4 với `main` (`git diff main...feature/tv4-social --stat`).
- [ ] Kiểm tra không có ZIP, `.env`, token, mật khẩu hay file backup vô tình đưa vào commit; đặc biệt chú ý `backend.zip` đã từng có trong commit sao lưu.
- [ ] Đọc API, policy và cấu trúc DB trong README này.
- [ ] Chạy Backend + Frontend + smoke read-only, lưu log build/test.
- [ ] Phối hợp TV3 xác minh Facility/Court, TV2 xác minh tài khoản/role, TV5 xác minh payment/tournament result.
- [ ] Chạy E2E thay đổi dữ liệu trên DB test riêng và cập nhật báo cáo Tuần 8.
- [ ] Chốt chính sách hủy sát giờ, giờ check-in, cách tính delta theo set và cập nhật code/test tương ứng.
- [ ] Rà soát warnings bảo mật và EF precision trước khi đưa production.
- [ ] Merge bằng PR, review các file chung (`App.tsx`, layouts, `DependencyInjection.cs`, repository).

### 12.2. Quy trình Git đề xuất

```powershell
git branch --show-current
git status --short
git diff --stat
# Chỉ stage các file đã review, không dùng git add . nếu thư mục gốc có ZIP/.env
# git add <các đường dẫn được phê duyệt>
# git commit -m "docs(tv4): consolidated handover weeks 3-8"
```

**Về `backend.zip` từng được commit:** `git rm --cached backend.zip` chỉ xóa khỏi **chỉ mục ở commit tiếp theo**, không xóa nội dung khỏi lịch sử commit cũ. Nếu ZIP có secrets thì phải đánh giá và xử lý lịch sử/rotate secret trước khi push; không tự force-push lên nhánh dùng chung.

### 12.3. Vị trí bảo trì trong tương lai

- **Quy định nghiệp vụ:** `SocialTicketPolicy.cs`, `SocialAttendancePolicy.cs`, `SkillRatingPolicy.cs`.
- **Thanh toán thật:** adapter TV5 gọi `ISocialTicketService.ConfirmPaidAsync`, xử lý refund gateway và đối soát.
- **Rating sau Social:** cần thiết kế dữ liệu kết quả Social và trigger tính điểm sau xác minh thắng/thua; tránh dùng giả định.
- **Tối ưu/quy mô:** kiểm thử concurrency bán slot cuối, background job nhiều instance, idempotency thanh toán/check-in/rating; bổ sung integration test DB và đo log.
- **Tài liệu:** cập nhật chính README này khi contract/policy thay đổi, thay vì sinh nhiều README theo tuần.

## 13. Bảng xác nhận bàn giao

| Trường | Thông tin cần điền |
|---|---|
| Người bàn giao | … |
| Người nhận bàn giao | … |
| Nhánh / Commit | … |
| Ngày bàn giao | … |
| Phiên bản DB / môi trường test | … |
| Build Backend/Frontend | … |
| Số unit test PASS/FAIL | … |
| Kết quả smoke test | … |
| Số E2E PASS/FAIL/BLOCKED/NOT RUN | … |
| Các dependency chưa hoàn tất | … |
| Liên kết PR, ảnh, video hoặc log kiểm thử | … |
| Xác nhận của nhóm | … |

---

### Nguồn lập tài liệu và nguyên tắc cập nhật

Tài liệu được tổng hợp từ **file phân công `phancong_updated.xlsx`**, các gói code TV4 Tuần 3, 4, 5 Backend, 5 Frontend, 6, 7, 8 cùng log build/test và phản hồi API đã được người thực hiện cung cấp. Các đoạn **còn chờ TV2/TV3/TV5, cần chốt chính sách hoặc chưa có minh chứng E2E** được ghi công khai, không tuyên bố hoàn tất khi chưa được xác thực.

**Tệp bàn giao chính:** `README_TV4_BAN_GIAO.md` — duy trì một nguồn tài liệu duy nhất cho TV4 từ Tuần 3 đến Tuần 8.
