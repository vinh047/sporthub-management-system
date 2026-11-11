namespace SportHub.Application.Interfaces.Services;

public interface IAvatarStorage
{
    Task<string> SaveAsync(
        Stream fileStream,
        string extension,
        int userId
    );

    Task DeleteAsync(string? avatarUrl);
}