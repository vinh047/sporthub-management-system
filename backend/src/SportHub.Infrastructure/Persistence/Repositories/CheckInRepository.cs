using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class CheckInRepository(SportHubDbContext context)
    : Repository<CheckInLog>(context), ICheckInRepository
{
    // Chi tiết đơn kèm đủ thông tin để hiển thị và kiểm tra check-in
    private IQueryable<BookingDetail> Details => _context.BookingDetails
        .Include(d => d.Booking).ThenInclude(b => b.User)
        .Include(d => d.Court)
        .Include(d => d.TimeSlot)
        .Include(d => d.CheckInLogs).ThenInclude(l => l.StaffUser);

    public Task<BookingDetail?> GetDetailForCheckInAsync(int bookingDetailId)
        => Details.FirstOrDefaultAsync(d => d.Id == bookingDetailId);

    public Task<List<BookingDetail>> SearchDetailsAsync(string keyword, DateOnly playDate)
        => Details
            .AsNoTracking()
            .Where(d => d.PlayDate == playDate &&
                (d.Booking.BookingCode.Contains(keyword)
                 || (d.Booking.GuestPhone != null && d.Booking.GuestPhone.Contains(keyword))
                 || (d.Booking.GuestName != null && d.Booking.GuestName.Contains(keyword))
                 || (d.Booking.User != null &&
                     (d.Booking.User.PhoneNumber.Contains(keyword) || d.Booking.User.FullName.Contains(keyword)))))
            .OrderBy(d => d.TimeSlot.StartTime)
            .ToListAsync();

    public Task<List<BookingDetail>> GetDetailsByFacilityAsync(int facilityId, DateOnly playDate)
        => Details
            .AsNoTracking()
            .Where(d => d.PlayDate == playDate
                && d.Court.FacilityId == facilityId
                && d.Booking.BookingStatus != BookingStatus.Cancelled)
            .OrderBy(d => d.TimeSlot.StartTime).ThenBy(d => d.Court.CourtName)
            .ToListAsync();

    public Task<List<CheckInLog>> GetCheckInHistoryAsync(int facilityId, DateOnly? playDate = null)
    {
        var query = _context.CheckInLogs
            .AsNoTracking()
            .Include(l => l.StaffUser)
            .Include(l => l.ParticipantUser)
            .Include(l => l.BookingDetail).ThenInclude(d => d.Booking).ThenInclude(b => b.User)
            .Include(l => l.BookingDetail).ThenInclude(d => d.Court)
            .Include(l => l.BookingDetail).ThenInclude(d => d.TimeSlot)
            .Where(l => l.BookingDetail.Court.FacilityId == facilityId);

        if (playDate.HasValue)
            query = query.Where(l => l.BookingDetail.PlayDate == playDate.Value);

        return query
            .OrderByDescending(l => l.CheckInAt)
            .ToListAsync();
    }

    public Task<int?> GetStaffFacilityIdAsync(int staffUserId)
        => _context.StaffProfiles
            .AsNoTracking()
            .Where(s => s.UserId == staffUserId)
            .Select(s => s.ManagedFacilityId)
            .FirstOrDefaultAsync();

    public Task<Booking?> GetBookingForReceptionAsync(int bookingId)
        => _context.Bookings
            .Include(b => b.User).ThenInclude(u => u!.PlayerProfile)
            .Include(b => b.CreatedByStaff)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Sport)
            .Include(b => b.Details).ThenInclude(d => d.TimeSlot)
            .Include(b => b.Details).ThenInclude(d => d.CheckInLogs).ThenInclude(l => l.StaffUser)
            .Include(b => b.PaymentTransactions).ThenInclude(p => p.PaymentMethod)
            .Include(b => b.PaymentTransactions).ThenInclude(p => p.StaffVerifier)
            .Include(b => b.Cancellation).ThenInclude(c => c!.CancelledByUser)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

    public async Task<PlayerProfile?> GetOrCreatePlayerProfileAsync(int userId)
    {
        var profile = await _context.PlayerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is not null) return profile;

        var userExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Id == userId);
        if (!userExists) return null;

        profile = new PlayerProfile
        {
            UserId = userId,
            ReputationScore = 100,
            NumericSkillRating = 2.00m,
            SkillLevel = "Beginner",
            TotalMatchesPlayed = 0,
            TotalNoShows = 0,
            LoyaltyPoints = 0,
            CurrentTier = "Bronze"
        };
        await _context.PlayerProfiles.AddAsync(profile);
        return profile;
    }

    public async Task<int> GetBookingLoyaltyPointsAsync(int bookingId)
        => await _context.LoyaltyHistories
            .AsNoTracking()
            .Where(h => h.RelatedBookingId == bookingId)
            .SumAsync(h => (int?)h.PointsChanged) ?? 0;

    public async Task<int> GetBookingReputationDeltaAsync(int bookingId)
        => await _context.ReputationHistories
            .AsNoTracking()
            .Where(h => h.RelatedBookingId == bookingId)
            .SumAsync(h => (int?)h.ScoreDelta) ?? 0;

    public async Task AddLoyaltyHistoryAsync(LoyaltyHistory history)
        => await _context.LoyaltyHistories.AddAsync(history);

    public async Task AddReputationHistoryAsync(ReputationHistory history)
        => await _context.ReputationHistories.AddAsync(history);

    public void RemoveCheckInLog(CheckInLog log)
        => _context.CheckInLogs.Remove(log);
}
