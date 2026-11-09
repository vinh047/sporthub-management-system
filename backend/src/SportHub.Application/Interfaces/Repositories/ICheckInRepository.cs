using SportHub.Domain.Entities.Booking;

namespace SportHub.Application.Interfaces.Repositories;

public interface ICheckInRepository : IRepository<CheckInLog>
{
    Task<BookingDetail?> GetDetailForCheckInAsync(int bookingDetailId);
    Task<List<BookingDetail>> SearchDetailsAsync(string keyword, DateOnly playDate);
    Task<List<BookingDetail>> GetDetailsByFacilityAsync(int facilityId, DateOnly playDate);
    Task<List<CheckInLog>> GetCheckInHistoryAsync(int facilityId, DateOnly? playDate = null);
    Task<int?> GetStaffFacilityIdAsync(int staffUserId);
}
