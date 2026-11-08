namespace SportHub.Application.Interfaces.Services;

/// <summary>Băm và kiểm tra mật khẩu — implement ở Infrastructure (BCrypt)</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);

    /// <summary>True nếu hash dùng cách cũ (SHA256) và nên băm lại bằng BCrypt</summary>
    bool NeedsRehash(string passwordHash);
}
