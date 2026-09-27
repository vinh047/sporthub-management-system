using SportHub.Application.Common;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.DTOs.MatchRoom;
using SportHub.Application.DTOs.Report;

namespace SportHub.Application.Interfaces.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task UpdateSportProfileAsync(int userId, UpdateSportProfileRequest request);
}

public interface IFacilityService
{
    Task<FacilityResponse> CreateFacilityAsync(CreateFacilityRequest request);
    Task<FacilityResponse> UpdateFacilityAsync(int id, UpdateFacilityRequest request);
    Task<IEnumerable<FacilityResponse>> GetAllFacilitiesAsync(bool activeOnly = true);
    Task<FacilityDetailResponse> GetFacilityDetailAsync(int id);
    Task SetFacilityActiveAsync(int id, bool isActive);
}

public interface ICourtService
{
    Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request);
    Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(
        int facilityId, int sportId, DateOnly date);
    Task LockCourtForMaintenanceAsync(LockCourtRequest request);
}

public interface IPricingService
{
    Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId);
    Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request);
}

public interface IBookingService
{
    /// <summary>Giữ chỗ 10 phút với race condition protection</summary>
    Task<BookingResponse> HoldSlotAsync(HoldSlotRequest request, int? userId = null);
    Task<BookingResponse> ConfirmBookingAsync(int bookingId, ConfirmBookingRequest request);
    Task CancelBookingAsync(int bookingId, int cancelledByUserId, string reason);
    Task<IEnumerable<BookingResponse>> GetUserBookingsAsync(int userId);
    Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId);
}

public interface ICheckInService
{
    Task CheckInAsync(CheckInRequest request, int staffUserId);
}

public interface IMatchRoomService
{
    Task<MatchRoomResponse> CreateRoomAsync(CreateRoomRequest request, int hostUserId);
    Task<PagedResult<MatchRoomSummary>> SearchRoomsAsync(SearchRoomsRequest request);
    Task<MatchRoomDetailResponse> GetRoomDetailAsync(int roomId);
    Task JoinRoomAsync(int roomId, int userId);
    Task LeaveRoomAsync(int roomId, int userId, string? reason);
    Task CloseRoomAsync(int roomId, int hostUserId);
}

public interface IReputationService
{
    Task AddDeltaAsync(int userId, int delta, string reason, int? relatedBookingId = null);
    Task<int> GetScoreAsync(int userId);
}

public interface INotificationService
{
    Task SendToUserAsync(int userId, string templateCode, Dictionary<string, string> placeholders);
    Task BroadcastCourtStatusAsync(int courtId, string status);
}

public interface IReportService
{
    Task<RevenueReportResponse> GetRevenueReportAsync(int facilityId, DateOnly from, DateOnly to);
    Task<OccupancyReportResponse> GetOccupancyReportAsync(int facilityId, DateOnly date);
}

