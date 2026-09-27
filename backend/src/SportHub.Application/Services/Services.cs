using Microsoft.Extensions.Logging;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.DTOs.MatchRoom;
using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities;
using SportHub.Domain.Exceptions;
using System.Security.Cryptography;
using System.Text;

namespace SportHub.Application.Services;

public class AuthService(IUnitOfWork uow, IJwtTokenProvider jwt, ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
            throw new ValidationException(["Mật khẩu xác nhận không khớp."]);

        var existing = await uow.Users.GetByPhoneNumberAsync(request.PhoneNumber);
        if (existing is not null)
            throw new ConflictException("Số điện thoại đã được đăng ký.");

        var user = new Domain.Entities.Auth.User
        {
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = HashPassword(request.Password),
            IsActive = true
        };

        await uow.Users.AddAsync(user);

        // Tạo PlayerProfile mặc định với 100 điểm uy tín
        var profile = new Domain.Entities.Player.PlayerProfile
        {
            UserId = user.Id,

            ReputationScore = 100
        };
        // TODO: Add profile via UoW

        await uow.SaveChangesAsync();

        logger.LogInformation("User {Phone} registered successfully", request.PhoneNumber);

        var token = jwt.GenerateToken(user, "PLAYER");
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, "PLAYER",
            token.AccessToken, token.ExpiresAt);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await uow.Users.GetByPhoneNumberAsync(request.PhoneNumber)
            ?? throw new NotFoundException("Tài khoản", request.PhoneNumber);

        if (!VerifyPassword(request.Password, user.PasswordHash))
            throw new ForbiddenException("Sai số điện thoại hoặc mật khẩu.");

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản đã bị khóa do điểm uy tín thấp.");

        // TODO: Load role
        var role = "PLAYER"; // placeholder

        var token = jwt.GenerateToken(user, role);
        return new AuthResponse(user.Id, user.FullName, user.PhoneNumber, role,
            token.AccessToken, token.ExpiresAt);
    }

    public async Task UpdateSportProfileAsync(int userId, UpdateSportProfileRequest request)
    {
        if (!request.Sports.Any())
            throw new ValidationException(["Phải chọn ít nhất 1 môn thể thao."]);

        // TODO: Upsert UserFavoriteSport records
        await uow.SaveChangesAsync();
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
        => HashPassword(password) == hash;
}

// ---------- Stub services (thành viên sẽ implement) ----------

public class FacilityService(IUnitOfWork uow) : IFacilityService
{
    public Task<FacilityResponse> CreateFacilityAsync(CreateFacilityRequest request) => throw new NotImplementedException();
    public Task<FacilityResponse> UpdateFacilityAsync(int id, UpdateFacilityRequest request) => throw new NotImplementedException();
    public Task<IEnumerable<FacilityResponse>> GetAllFacilitiesAsync(bool activeOnly = true) => throw new NotImplementedException();
    public Task<FacilityDetailResponse> GetFacilityDetailAsync(int id) => throw new NotImplementedException();
    public Task SetFacilityActiveAsync(int id, bool isActive) => throw new NotImplementedException();
}

public class CourtService(IUnitOfWork uow) : ICourtService
{
    public Task<CourtResponse> CreateCourtAsync(CreateCourtRequest request) => throw new NotImplementedException();
    public Task<IEnumerable<CourtAvailabilityResponse>> GetAvailableCourtSlotsAsync(int facilityId, int sportId, DateOnly date) => throw new NotImplementedException();
    public Task LockCourtForMaintenanceAsync(LockCourtRequest request) => throw new NotImplementedException();
}

public class PricingService(IUnitOfWork uow) : IPricingService
{
    public Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId) => throw new NotImplementedException();
    public Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request) => throw new NotImplementedException();
}

public class BookingService(IUnitOfWork uow, IPricingService pricing) : IBookingService
{
    public Task<BookingResponse> HoldSlotAsync(HoldSlotRequest request, int? userId = null) => throw new NotImplementedException();
    public Task<BookingResponse> ConfirmBookingAsync(int bookingId, ConfirmBookingRequest request) => throw new NotImplementedException();
    public Task CancelBookingAsync(int bookingId, int cancelledByUserId, string reason) => throw new NotImplementedException();
    public Task<IEnumerable<BookingResponse>> GetUserBookingsAsync(int userId) => throw new NotImplementedException();
    public Task<BookingDetailResponse> GetBookingDetailAsync(int bookingId) => throw new NotImplementedException();
}

public class CheckInService(IUnitOfWork uow, IReputationService reputation) : ICheckInService
{
    public Task CheckInAsync(CheckInRequest request, int staffUserId) => throw new NotImplementedException();
}

public class MatchRoomService(IUnitOfWork uow, IReputationService reputation, INotificationService notification) : IMatchRoomService
{
    public Task<MatchRoomResponse> CreateRoomAsync(CreateRoomRequest request, int hostUserId) => throw new NotImplementedException();
    public Task<PagedResult<MatchRoomSummary>> SearchRoomsAsync(SearchRoomsRequest request) => throw new NotImplementedException();
    public Task<MatchRoomDetailResponse> GetRoomDetailAsync(int roomId) => throw new NotImplementedException();
    public Task JoinRoomAsync(int roomId, int userId) => throw new NotImplementedException();
    public Task LeaveRoomAsync(int roomId, int userId, string? reason) => throw new NotImplementedException();
    public Task CloseRoomAsync(int roomId, int hostUserId) => throw new NotImplementedException();
}

public class ReputationService(IUnitOfWork uow) : IReputationService
{
    public Task AddDeltaAsync(int userId, int delta, string reason, int? relatedBookingId = null) => throw new NotImplementedException();
    public Task<int> GetScoreAsync(int userId) => throw new NotImplementedException();
}

public class NotificationService(IUnitOfWork uow) : INotificationService
{
    public Task SendToUserAsync(int userId, string templateCode, Dictionary<string, string> placeholders) => throw new NotImplementedException();
    public Task BroadcastCourtStatusAsync(int courtId, string status) => throw new NotImplementedException();
}

public class ReportService(IUnitOfWork uow) : IReportService
{
    public Task<RevenueReportResponse> GetRevenueReportAsync(int facilityId, DateOnly from, DateOnly to) => throw new NotImplementedException();
    public Task<OccupancyReportResponse> GetOccupancyReportAsync(int facilityId, DateOnly date) => throw new NotImplementedException();
}

