namespace SportHub.Domain.Exceptions;

/// <summary>
/// 403 Forbidden — không đủ quyền hoặc tài khoản bị khóa
/// </summary>
public class ForbiddenException : DomainException
{
    public ForbiddenException(string message) : base(message) { }
}
