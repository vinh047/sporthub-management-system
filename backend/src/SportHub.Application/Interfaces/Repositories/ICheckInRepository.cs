using SportHub.Domain.Entities.Booking;

namespace SportHub.Application.Interfaces.Repositories;

public interface ICheckInRepository : IRepository<CheckInLog>
{
    Task<BookingDetail?> GetDetailForCheckInAsync(int bookingDetailId);
    Task<List<BookingDetail>> SearchDetailsAsync(string keyword, DateOnly playDate);
    Task<List<BookingDetail>> GetDetailsByFacilityAsync(int facilityId, DateOnly playDate);
    Task<int?> GetStaffFacilityIdAsync(int staffUserId);
}
