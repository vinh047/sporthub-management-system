namespace SportHub.Application.DTOs.Notifications;

public record NotificationResponse(
    int Id,
    string Title,
    string Content,
    bool IsRead,
    DateTime CreatedAt
);