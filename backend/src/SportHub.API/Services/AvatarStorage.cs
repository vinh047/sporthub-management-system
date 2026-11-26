using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Services;

public class AvatarStorage(IWebHostEnvironment environment)
    : IAvatarStorage
{
    private const string AvatarFolder = "uploads/avatars";

    public async Task<string> SaveAsync(
        Stream fileStream,
        string extension,
        int userId)
    {
        var webRoot = environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(
                environment.ContentRootPath,
                "wwwroot"
            );
        }

        var folderPath = Path.Combine(
            webRoot,
            "uploads",
            "avatars"
        );

        Directory.CreateDirectory(folderPath);

        var fileName = $"avatar_{userId}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(folderPath, fileName);

        await using var output = new FileStream(
            filePath,
            FileMode.CreateNew,
            FileAccess.Write
        );

        await fileStream.CopyToAsync(output);

        return $"/{AvatarFolder}/{fileName}";
    }

    public Task DeleteAsync(string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl))
            return Task.CompletedTask;

        const string prefix = "/uploads/avatars/";

        // Chỉ xóa file thuộc thư mục avatar do hệ thống quản lý.
        if (!avatarUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;

        var fileName = Path.GetFileName(avatarUrl);

        if (string.IsNullOrWhiteSpace(fileName))
            return Task.CompletedTask;

        var webRoot = environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(
                environment.ContentRootPath,
                "wwwroot"
            );
        }

        var filePath = Path.Combine(
            webRoot,
            "uploads",
            "avatars",
            fileName
        );

        if (File.Exists(filePath))
            File.Delete(filePath);

        return Task.CompletedTask;
    }
}