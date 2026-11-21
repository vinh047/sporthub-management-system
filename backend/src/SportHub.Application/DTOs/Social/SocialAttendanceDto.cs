namespace SportHub.Application.DTOs.Social;

public record SocialAttendeeDto(int Id, int UserId, string FullName, string Status,
    decimal PaidAmount, bool CanCheckIn);
public record SocialAttendanceDto(int SessionId, string Title, DateTime OpensAtUtc,
    DateTime ClosesAtUtc, IReadOnlyList<SocialAttendeeDto> Participants);
