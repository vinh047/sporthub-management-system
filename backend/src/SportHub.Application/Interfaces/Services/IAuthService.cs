
using SportHub.Application.DTOs.Auth;

namespace SportHub.Application.Interfaces.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    Task<AuthResponse> LoginAsync(LoginRequest request);

    Task<MeResponse> GetMeAsync(int userId);

    Task UpdateSportProfileAsync(
        int userId,
        UpdateSportProfileRequest request
    );

    Task<MeResponse> UpdateAccountAsync(
        int userId,
        UpdateAccountRequest request
    );

    Task ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request
    );
}
