using Microsoft.Extensions.Logging;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Exceptions;
using System.Security.Cryptography;
using System.Text;

namespace SportHub.Application.Services;

public class AuthService(IUnitOfWork uow, IJwtTokenProvider jwt, ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
            throw new ValidationException(["Mật khẩu xác nhận không khớp."]);

        var existing = await uow.Users.GetByPhoneNumberAsync(request.PhoneNumber);
        if (existing is not null)
            throw new ConflictException("Số điện thoại đã được đăng ký.");

        var user = new User
        {
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = HashPassword(request.Password),
            IsActive = true
        };

        await uow.Users.AddAsync(user);

        // Tạo PlayerProfile mặc định với 100 điểm uy tín
        var profile = new PlayerProfile
        {
            UserId = user.Id,
            ReputationScore = 100
        };
        // TODO: Add profile via UoW

        await uow.SaveChangesAsync();

        logger.LogInformation("User {Phone} registered successfully", request.PhoneNumber);

        var token = jwt.GenerateToken(user, "PLAYER");
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, "PLAYER",
            token.AccessToken, token.ExpiresAt);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await uow.Users.GetByPhoneNumberAsync(request.PhoneNumber)
            ?? throw new NotFoundException("Tài khoản", request.PhoneNumber);

        if (!VerifyPassword(request.Password, user.PasswordHash))
            throw new ForbiddenException("Sai số điện thoại hoặc mật khẩu.");

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản đã bị khóa do điểm uy tín thấp.");

        // TODO: Load role
        var role = "PLAYER"; // placeholder

        var token = jwt.GenerateToken(user, role);
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, role,
            token.AccessToken, token.ExpiresAt);
    }

    public async Task UpdateSportProfileAsync(int userId, UpdateSportProfileRequest request)
    {
        if (!request.Sports.Any())
            throw new ValidationException(["Phải chọn ít nhất 1 môn thể thao."]);

        // TODO: Upsert UserFavoriteSport records
        await uow.SaveChangesAsync();
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
        => HashPassword(password) == hash;
}
