using SportHub.Application.DTOs.Social;

namespace SportHub.Application.Interfaces.Services;

public interface ISocialAttendanceService
{
    Task<SocialAttendanceDto> ListAsync(int sessionId, int managerId, CancellationToken ct = default);
    Task<SocialAttendeeDto> CheckInAsync(int sessionId, int ticketId, int managerId, CancellationToken ct = default);
    Task<int> ScanNoShowsAsync(CancellationToken ct = default);
}
