namespace SportHub.Domain.Exceptions;

/// <summary>
/// 404 Not Found — resource không tồn tại
/// </summary>
public class NotFoundException : DomainException
{
    public NotFoundException(string entityName, object key)
        : base($"{entityName} với id '{key}' không tồn tại.") { }
}
