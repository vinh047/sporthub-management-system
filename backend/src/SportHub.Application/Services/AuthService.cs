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


    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var fullName = request.FullName?.Trim() ?? string.Empty;
        var phone = request.PhoneNumber?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;
        var confirmPassword = request.ConfirmPassword ?? string.Empty;

        var errors = new List<string>();

        // 1. Kiểm tra họ tên
        if (string.IsNullOrWhiteSpace(fullName))
            errors.Add("Vui lòng nhập họ tên.");

        if (fullName.Length > 100)
            errors.Add("Họ tên không được vượt quá 100 ký tự.");

        // 2. Kiểm tra số điện thoại
        if (phone.Length < 9 ||
            phone.Length > 15 ||
            !phone.All(char.IsDigit))
        {
            errors.Add("Số điện thoại không hợp lệ.");
        }

        // 3. Kiểm tra mật khẩu
        if (password.Length < 6)
            errors.Add("Mật khẩu phải có ít nhất 6 ký tự.");

        if (password != confirmPassword)
            errors.Add("Mật khẩu xác nhận không khớp.");

        if (errors.Count > 0)
            throw new ValidationException(errors);

        // 4. Kiểm tra số điện thoại đã tồn tại
        var existingUser =
            await uow.Users.GetByPhoneNumberAsync(phone);

        if (existingUser != null)
            throw new ConflictException(
                "Số điện thoại đã được đăng ký.");

        // 5. Lấy Role PLAYER
        var playerRole =
            await uow.Users.GetRoleByCodeAsync("PLAYER")
            ?? throw new InvalidOperationException(
                "Chưa có Role PLAYER trong database.");

        // 6. Tạo tài khoản và hồ sơ người chơi
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

        // 7. Lưu database
        await uow.Users.AddAsync(user);
        await uow.SaveChangesAsync();

        logger.LogInformation(
            "User {Phone} registered successfully", phone);

        // 8. Trả kết quả
        return BuildAuthResponse(user, "PLAYER", null);
    }



    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var phone = request.PhoneNumber?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;

        // 1. Tìm tài khoản
        var user = await uow.Users.GetForLoginAsync(phone);

        // 2. Kiểm tra tài khoản và mật khẩu
        if (user == null ||
            !passwordHasher.Verify(password, user.PasswordHash))
        {
            throw new UnauthorizedException(
                "Sai số điện thoại hoặc mật khẩu.");
        }

        // 3. Kiểm tra điểm uy tín theo SRS
        if (user.PlayerProfile != null &&
            user.PlayerProfile.ReputationScore < 40)
        {
            // Tự động khóa tài khoản
            if (user.IsActive)
            {
                user.IsActive = false;
                await uow.SaveChangesAsync();
            }

            throw new ForbiddenException(
                "Tài khoản bị khóa do điểm uy tín dưới 40.");
        }

        // 4. Kiểm tra tài khoản có bị Admin khóa không
        if (!user.IsActive)
        {
            throw new ForbiddenException(
                "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin.");
        }

        // 5. Nếu mật khẩu cũ dùng SHA256 thì chuyển sang BCrypt
        if (passwordHasher.NeedsRehash(user.PasswordHash))
        {
            user.PasswordHash = passwordHasher.Hash(password);
            await uow.SaveChangesAsync();
        }

        // 6. Lấy Role
        var role = RoleOf(user);

        // 7. Lấy FacilityId nếu là Staff
        var facilityId = FacilityOf(user, role);

        // 8. Sinh JWT và trả kết quả
        return BuildAuthResponse(user, role, facilityId);
    }


    public async Task<MeResponse> GetMeAsync(int userId)
    {
        var user = await uow.Users.GetWithProfileAsync(userId)
            ?? throw new NotFoundException("Tài khoản", userId);

        var role = RoleOf(user);
        var p = user.PlayerProfile;
        var player = p is null
            ? null
            : new PlayerSummary(p.ReputationScore, p.NumericSkillRating, p.SkillLevel,
                p.LoyaltyPoints, p.CurrentTier, p.TotalMatchesPlayed);

        return new MeResponse(user.Id, user.FullName, user.PhoneNumber, role, FacilityOf(user, role), player);
    }

    public async Task UpdateSportProfileAsync(int userId, UpdateSportProfileRequest request)
    {
        if (!request.Sports.Any())
            throw new ValidationException(["Phải chọn ít nhất 1 môn thể thao."]);

        // TODO: Upsert UserFavoriteSport records
        await uow.SaveChangesAsync();
    }

    private static string RoleOf(User user)
    {
        return user.UserRole?.Role?.RoleCode
            ?? throw new ForbiddenException(
                "Tài khoản chưa được phân quyền.");
    }

    private static int? FacilityOf(User user, string role)
        => role == StaffRole ? user.StaffProfile?.ManagedFacilityId : null;

    private AuthResponse BuildAuthResponse(User user, string role, int? facilityId)
    {
        var token = jwt.GenerateToken(user, role, facilityId);
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, role, facilityId,
            token.AccessToken, token.ExpiresAt);
    }
}
