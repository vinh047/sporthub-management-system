namespace SportHub.Domain.Exceptions;

/// <summary>
/// 409 Conflict — race condition slot, phòng ghép đầy
/// </summary>
public class ConflictException : DomainException
{
    public ConflictException(string message) : base(message) { }
}
