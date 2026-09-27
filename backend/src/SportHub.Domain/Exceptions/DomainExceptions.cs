namespace SportHub.Domain.Exceptions;

/// <summary>
/// Base exception cho tất cả lỗi nghiệp vụ trong Domain
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}

/// <summary>
/// 409 Conflict — race condition slot, phòng ghép đầy
/// </summary>
public class ConflictException : DomainException
{
    public ConflictException(string message) : base(message) { }
}

/// <summary>
/// 404 Not Found — resource không tồn tại
/// </summary>
public class NotFoundException : DomainException
{
    public NotFoundException(string entityName, object key)
        : base($"{entityName} với id '{key}' không tồn tại.") { }
}

/// <summary>
/// 403 Forbidden — không đủ quyền hoặc tài khoản bị khóa
/// </summary>
public class ForbiddenException : DomainException
{
    public ForbiddenException(string message) : base(message) { }
}

/// <summary>
/// 400 Bad Request — dữ liệu không hợp lệ
/// </summary>
public class ValidationException : DomainException
{
    public IReadOnlyList<string> Errors { get; }

    public ValidationException(IEnumerable<string> errors)
        : base("Dữ liệu không hợp lệ.")
    {
        Errors = errors.ToList().AsReadOnly();
    }
}
