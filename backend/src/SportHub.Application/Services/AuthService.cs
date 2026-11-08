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
        var phone = request.PhoneNumber?.Trim() ?? string.Empty;
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName)) errors.Add("Nhập họ tên.");
        if (phone.Length is < 9 or > 15 || !phone.All(char.IsDigit)) errors.Add("Số điện thoại không hợp lệ.");
        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 6) errors.Add("Mật khẩu phải có ít nhất 6 ký tự.");
        if (request.Password != request.ConfirmPassword) errors.Add("Mật khẩu xác nhận không khớp.");
        if (errors.Count > 0) throw new ValidationException(errors);

        if (await uow.Users.GetByPhoneNumberAsync(phone) is not null)
            throw new ConflictException("Số điện thoại đã được đăng ký.");

        var playerRole = await uow.Users.GetRoleByCodeAsync(PlayerRole)
            ?? throw new InvalidOperationException("Chưa có vai trò PLAYER trong database. Chạy backend ở môi trường Development để tự tạo dữ liệu nền.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            PhoneNumber = phone,
            PasswordHash = passwordHasher.Hash(request.Password),
            IsActive = true,
            PlayerProfile = new PlayerProfile(),   // mặc định: 100 uy tín, 2.00 Beginner, 0 điểm, hạng Bronze
            UserRole = new UserRole { Role = playerRole }
        };

        await uow.Users.AddAsync(user);
        await uow.SaveChangesAsync();

        logger.LogInformation("User {Phone} registered successfully", phone);
        return BuildAuthResponse(user, PlayerRole, null);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await uow.Users.GetForLoginAsync(request.PhoneNumber?.Trim() ?? string.Empty);

        // Cùng một thông báo cho sai SĐT và sai mật khẩu để không lộ SĐT nào đã đăng ký
        if (user is null || !passwordHasher.Verify(request.Password ?? string.Empty, user.PasswordHash))
            throw new UnauthorizedException("Sai số điện thoại hoặc mật khẩu.");

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");

        // Tài khoản cũ còn băm SHA256 thì băm lại bằng BCrypt
        if (passwordHasher.NeedsRehash(user.PasswordHash))
        {
            user.PasswordHash = passwordHasher.Hash(request.Password!);
            await uow.SaveChangesAsync();
        }

        var role = RoleOf(user);
        return BuildAuthResponse(user, role, FacilityOf(user, role));
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

    private static string RoleOf(User user) => user.UserRole?.Role.RoleCode ?? PlayerRole;

    private static int? FacilityOf(User user, string role)
        => role == StaffRole ? user.StaffProfile?.ManagedFacilityId : null;

    private AuthResponse BuildAuthResponse(User user, string role, int? facilityId)
    {
        var token = jwt.GenerateToken(user, role, facilityId);
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, role, facilityId,
            token.AccessToken, token.ExpiresAt);
    }
}
