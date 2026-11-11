
using Microsoft.Extensions.Logging;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class AuthService(
    IUnitOfWork uow,
    IJwtTokenProvider jwt,
    IPasswordHasher passwordHasher,
    ILogger<AuthService> logger) : IAuthService
{
    private const string PlayerRole = "PLAYER";
    private const string StaffRole = "STAFF";

    // ── Register ─────────────────────────────────────────────

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var fullName = request.FullName?.Trim() ?? string.Empty;
        var phone = request.PhoneNumber?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;
        var confirmPassword = request.ConfirmPassword ?? string.Empty;

        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(fullName))
            errors.Add("Vui lòng nhập họ tên.");

        if (fullName.Length > 100)
            errors.Add("Họ tên không được vượt quá 100 ký tự.");

        if (phone.Length is < 9 or > 15 || !phone.All(char.IsDigit))
            errors.Add("Số điện thoại không hợp lệ.");

        if (password.Length < 6)
            errors.Add("Mật khẩu phải có ít nhất 6 ký tự.");

        if (password != confirmPassword)
            errors.Add("Mật khẩu xác nhận không khớp.");

        if (errors.Count > 0)
            throw new ValidationException(errors);

        // Kiểm tra số điện thoại đã tồn tại
        if (await uow.Users.GetByPhoneNumberAsync(phone) is not null)
            throw new ConflictException("Số điện thoại đã được đăng ký.");

        // Lấy Role PLAYER
        var playerRole = await uow.Users.GetRoleByCodeAsync(PlayerRole)
            ?? throw new InvalidOperationException(
                "Chưa có vai trò PLAYER trong database. " +
                "Chạy backend ở môi trường Development để tự tạo dữ liệu nền.");

        // Tạo tài khoản và hồ sơ người chơi
        var user = new User
        {
            FullName = fullName,
            PhoneNumber = phone,
            PasswordHash = passwordHasher.Hash(password),
            IsActive = true,

            UserRole = new UserRole
            {
                Role = playerRole
            },

            PlayerProfile = new PlayerProfile
            {
                ReputationScore = 100,
                NumericSkillRating = 2.00m,
                SkillLevel = "Beginner",
                TotalMatchesPlayed = 0,
                TotalNoShows = 0,
                LoyaltyPoints = 0,
                CurrentTier = "Bronze"
            }
        };

        await uow.Users.AddAsync(user);
        await uow.SaveChangesAsync();

        logger.LogInformation(
            "User {Phone} registered successfully", phone);

        return BuildAuthResponse(user, PlayerRole, null);
    }

    // ── Demo Accounts ────────────────────────────────────────

    private static readonly Dictionary<string, (string FullName, string RoleCode, string[] Passwords)>
        DemoAccounts = new()
        {
            ["0900000000"] = ("Quản trị viên SportHub", "ADMIN",
                ["Admin@123", "Test@1234"]),

            ["0900000001"] = ("Super Admin", "ADMIN",
                ["Test@1234", "Admin@123"]),

            ["0900000002"] = ("Nhân viên lễ tân SportHub", "STAFF",
                ["Staff@123", "Test@1234"]),

            ["0911111111"] = ("Nguyen Van An (Lễ tân)", "STAFF",
                ["Test@1234", "Staff@123"]),

            ["0922222201"] = ("Phạm Minh Dũng", "PLAYER",
                ["Test@1234"]),

            ["0922222202"] = ("Hoàng Thị Lan", "PLAYER",
                ["Test@1234"])
        };

    // ── Login ────────────────────────────────────────────────

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var phone = request.PhoneNumber?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;

        var user = await uow.Users.GetForLoginAsync(phone);

        // Kiểm tra tài khoản Demo
        if (DemoAccounts.TryGetValue(phone, out var demo) &&
            demo.Passwords.Contains(password))
        {
            var roleEntity = await uow.Users.GetRoleByCodeAsync(demo.RoleCode);

            if (user is null && roleEntity is not null)
            {
                var firstFacility =
                    (await uow.Facilities.GetFacilitiesAsync(activeOnly: false))
                    .FirstOrDefault();

                user = new User
                {
                    FullName = demo.FullName,
                    PhoneNumber = phone,
                    PasswordHash = passwordHasher.Hash(password),
                    IsActive = true,

                    UserRole = new UserRole
                    {
                        Role = roleEntity
                    },

                    PlayerProfile = demo.RoleCode == PlayerRole
                        ? new PlayerProfile()
                        : null,

                    StaffProfile = demo.RoleCode == StaffRole
                        ? new StaffProfile
                        {
                            ManagedFacilityId = firstFacility?.Id ?? 1,
                            Position = "Lễ tân"
                        }
                        : null
                };

                await uow.Users.AddAsync(user);
                await uow.SaveChangesAsync();
            }
            else if (user is not null)
            {
                // Chỉ bổ sung Role nếu tài khoản cũ chưa có Role.
                // Không tự động mở khóa tài khoản đã bị Admin khóa.
                if (user.UserRole is null && roleEntity is not null)
                {
                    user.UserRole = new UserRole
                    {
                        Role = roleEntity
                    };
                }

                // Đồng bộ mật khẩu Demo nếu mật khẩu hiện tại khác.
                if (!passwordHasher.Verify(password, user.PasswordHash))
                {
                    user.PasswordHash = passwordHasher.Hash(password);
                }

                await uow.SaveChangesAsync();
            }
        }

        // Cùng một thông báo cho sai SĐT và sai mật khẩu
        // để không tiết lộ số điện thoại đã đăng ký.
        if (user is null ||
            !passwordHasher.Verify(password, user.PasswordHash))
        {
            throw new UnauthorizedException(
                "Sai số điện thoại hoặc mật khẩu.");
        }

        // Kiểm tra điểm uy tín theo SRS
        if (user.PlayerProfile is not null &&
            user.PlayerProfile.ReputationScore < 40)
        {
            if (user.IsActive)
            {
                user.IsActive = false;
                await uow.SaveChangesAsync();
            }

            throw new ForbiddenException(
                "Tài khoản bị khóa do điểm uy tín dưới 40.");
        }

        // Kiểm tra tài khoản có bị Admin khóa không
        if (!user.IsActive)
        {
            throw new ForbiddenException(
                "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin.");
        }

        // Tự động nâng cấp mật khẩu SHA256 cũ lên BCrypt
        if (passwordHasher.NeedsRehash(user.PasswordHash))
        {
            user.PasswordHash = passwordHasher.Hash(password);
            await uow.SaveChangesAsync();
        }

        var role = RoleOf(user);
        var facilityId = FacilityOf(user, role);

        return BuildAuthResponse(user, role, facilityId);
    }

    // ── Get Current User ─────────────────────────────────────

    public async Task<MeResponse> GetMeAsync(int userId)
    {
        var user = await uow.Users.GetWithProfileAsync(userId)
            ?? throw new NotFoundException("Tài khoản", userId);

        var role = RoleOf(user);
        var p = user.PlayerProfile;

        var player = p is null
            ? null
            : new PlayerSummary(
                p.ReputationScore,
                p.NumericSkillRating,
                p.SkillLevel,
                p.LoyaltyPoints,
                p.CurrentTier,
                p.TotalMatchesPlayed);

        return new MeResponse(
            user.Id,
            user.FullName,
            user.PhoneNumber,
            role,
            FacilityOf(user, role),
            player);
    }

    // ── Update Sport Profile ─────────────────────────────────

    public async Task UpdateSportProfileAsync(
        int userId,
        UpdateSportProfileRequest request)
    {
        if (!request.Sports.Any())
        {
            throw new ValidationException(
                ["Phải chọn ít nhất 1 môn thể thao."]);
        }

        // TODO: Upsert UserFavoriteSport records
        await uow.SaveChangesAsync();
    }

    // ── Helpers ──────────────────────────────────────────────

    private static string RoleOf(User user)
    {
        return user.UserRole?.Role?.RoleCode
            ?? throw new ForbiddenException(
                "Tài khoản chưa được phân quyền.");
    }

    private static int? FacilityOf(User user, string role)
        => role == StaffRole
            ? user.StaffProfile?.ManagedFacilityId
            : null;

    private AuthResponse BuildAuthResponse(
        User user,
        string role,
        int? facilityId)
    {
        var token = jwt.GenerateToken(user, role, facilityId);

        return new AuthResponse(
            user.Id,
            user.FullName,
            user.PhoneNumber,
            role,
            facilityId,
            token.AccessToken,
            token.ExpiresAt);
    }
}
