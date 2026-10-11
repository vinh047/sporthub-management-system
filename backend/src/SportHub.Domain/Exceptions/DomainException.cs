namespace SportHub.Domain.Exceptions;

/// <summary>
/// Base exception cho tất cả lỗi nghiệp vụ trong Domain
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}
