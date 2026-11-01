namespace SportHub.Domain.Exceptions;

/// <summary>
/// 401 Unauthorized — sai thông tin đăng nhập
/// </summary>
public class UnauthorizedException : DomainException
{
    public UnauthorizedException(string message) : base(message) { }
}
