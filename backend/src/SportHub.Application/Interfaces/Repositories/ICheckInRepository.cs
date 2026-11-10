using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Entities.Player;

namespace SportHub.Application.Interfaces.Repositories;

public interface ICheckInRepository : IRepository<CheckInLog>
{
    Task<BookingDetail?> GetDetailForCheckInAsync(int bookingDetailId);
    Task<List<BookingDetail>> SearchDetailsAsync(string keyword, DateOnly playDate);
    Task<List<BookingDetail>> GetDetailsByFacilityAsync(int facilityId, DateOnly playDate);
    Task<List<CheckInLog>> GetCheckInHistoryAsync(int facilityId, DateOnly? playDate = null);
    Task<int?> GetStaffFacilityIdAsync(int staffUserId);
    Task<Booking?> GetBookingForReceptionAsync(int bookingId);
    Task<PlayerProfile?> GetOrCreatePlayerProfileAsync(int userId);
    Task<int> GetBookingLoyaltyPointsAsync(int bookingId);
    Task<int> GetBookingReputationDeltaAsync(int bookingId);
    Task AddLoyaltyHistoryAsync(LoyaltyHistory history);
    Task AddReputationHistoryAsync(ReputationHistory history);
    void RemoveCheckInLog(CheckInLog log);
}
