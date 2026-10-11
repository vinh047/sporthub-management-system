namespace SportHub.Domain.Exceptions;

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
