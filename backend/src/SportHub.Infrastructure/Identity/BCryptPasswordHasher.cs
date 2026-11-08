using SportHub.Application.Interfaces.Services;
using System.Security.Cryptography;
using System.Text;

namespace SportHub.Infrastructure.Identity;

public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string passwordHash)
    {
        if (!NeedsRehash(passwordHash))
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);

        // Tài khoản tạo trước khi chuyển sang BCrypt (băm SHA256, không salt)
        var legacy = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
        return legacy == passwordHash;
    }

    public bool NeedsRehash(string passwordHash) => !passwordHash.StartsWith("$2");
}
