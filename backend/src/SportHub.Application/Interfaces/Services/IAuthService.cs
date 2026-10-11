using SportHub.Application.DTOs.Auth;

namespace SportHub.Application.Interfaces.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task UpdateSportProfileAsync(int userId, UpdateSportProfileRequest request);
}
