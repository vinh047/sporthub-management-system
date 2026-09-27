using SportHub.Domain.Entities.Auth;

namespace SportHub.Application.Interfaces.Services;

/// <summary>
/// Interface cho JWT Token Provider — định nghĩa ở Application,
/// implement ở Infrastructure (Dependency Inversion Principle).
/// </summary>
public interface IJwtTokenProvider
{
    (string AccessToken, DateTime ExpiresAt) GenerateToken(User user, string role);
    System.Security.Claims.ClaimsPrincipal? ValidateToken(string token);
}
