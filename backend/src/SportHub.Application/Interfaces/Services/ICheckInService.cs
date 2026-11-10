using SportHub.Application.DTOs.CheckIn;

namespace SportHub.Application.Interfaces.Services;

public interface ICheckInService
{
    Task<List<CheckInItem>> LookupAsync(string keyword, int staffUserId, bool isAdmin);
    Task<List<CheckInItem>> GetTodayAsync(int facilityId, int staffUserId, bool isAdmin);
    Task<List<CheckInHistoryItemDto>> GetHistoryAsync(int facilityId, DateOnly? playDate, int staffUserId, bool isAdmin);
    Task CheckInAsync(CheckInRequest request, int staffUserId, bool isAdmin);
}
