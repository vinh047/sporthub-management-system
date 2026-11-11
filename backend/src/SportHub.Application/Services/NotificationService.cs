using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Notifications;
using SportHub.Application.DTOs.Notifications;

namespace SportHub.Application.Services;

public class NotificationService(
    IUnitOfWork uow,
    INotificationPublisher publisher
) : INotificationService
{
    public async Task SendToUserAsync(
        int userId,
        string templateCode,
        Dictionary<string, string> placeholders)
    {
        // 1. Tìm mẫu thông báo
        var template = await uow.NotificationTemplates
            .GetByCodeAsync(templateCode);

        if (template is null)
        {
            throw new InvalidOperationException(
                $"Không tìm thấy mẫu thông báo: {templateCode}");
        }

        // 2. Thay placeholder trong tiêu đề và nội dung
        var title = template.TitlePattern;
        var content = template.BodyPattern;

        foreach (var item in placeholders)
        {
            title = title.Replace(
                $"{{{item.Key}}}",
                item.Value,
                StringComparison.Ordinal);

            content = content.Replace(
                $"{{{item.Key}}}",
                item.Value,
                StringComparison.Ordinal);
        }

        // 3. Tạo thông báo để lưu vào database
        var notification = new UserNotification
        {
            UserId = userId,
            TemplateId = template.Id,
            Title = title,
            Content = content,
            IsRead = false
        };

        await uow.UserNotifications.AddAsync(notification);

        // 4. Lưu database trước
        await uow.SaveChangesAsync();

        // 5. Gửi thông báo real-time qua SignalR
        await publisher.SendToUserAsync(userId, title, content);
    }

    public async Task BroadcastCourtStatusAsync(int courtId, string status)
    {
        await publisher.BroadcastCourtStatusAsync(courtId, status);
    }

    public async Task<IEnumerable<NotificationResponse>> GetMyNotificationsAsync(int userId)
    {
        var notifications = await uow.UserNotifications.GetByUserIdAsync(userId);

        return notifications.Select(x => new NotificationResponse(
            x.Id,
            x.Title,
            x.Content,
            x.IsRead,
            x.CreatedAt
        ));
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        // Chỉ tìm thông báo thuộc về người dùng hiện tại
        var notification = await uow.UserNotifications
            .GetByIdForUserAsync(notificationId, userId);

        if (notification is null)
            return false;

        if (notification.IsRead)
            return true;

        notification.IsRead = true;

        uow.UserNotifications.Update(notification);

        await uow.SaveChangesAsync();

        return true;
    }
}