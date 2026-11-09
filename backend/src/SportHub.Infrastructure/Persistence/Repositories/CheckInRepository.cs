using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Booking;
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
        .Include(d => d.CheckInLogs);

    public Task<BookingDetail?> GetDetailForCheckInAsync(int bookingDetailId)
        => Details.FirstOrDefaultAsync(d => d.Id == bookingDetailId);

    public Task<List<BookingDetail>> SearchDetailsAsync(string keyword, DateOnly playDate)
        => Details
            .Where(d => d.PlayDate == playDate &&
                (d.Booking.BookingCode == keyword
                 || d.Booking.GuestPhone == keyword
                 || (d.Booking.User != null && d.Booking.User.PhoneNumber == keyword)))
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
            .Where(s => s.UserId == staffUserId)
            .Select(s => s.ManagedFacilityId)
            .FirstOrDefaultAsync();
}
