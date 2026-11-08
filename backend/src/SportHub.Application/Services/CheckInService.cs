using SportHub.Application.DTOs.CheckIn;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class CheckInService(IUnitOfWork uow) : ICheckInService
{
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    public async Task<List<CheckInItem>> LookupAsync(string keyword, int staffUserId, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            throw new ValidationException(["Nhập mã đơn hoặc số điện thoại."]);

        var details = await uow.CheckIns.SearchDetailsAsync(keyword.Trim(), Today);

        // Staff chỉ thấy đơn thuộc cơ sở mình
        if (!isAdmin)
        {
            var facilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            details = details.Where(d => d.Court.FacilityId == facilityId).ToList();
        }

        return details.Select(ToItem).ToList();
    }

    public async Task<List<CheckInItem>> GetTodayAsync(int facilityId, int staffUserId, bool isAdmin)
    {
        await EnsureSameFacilityAsync(facilityId, staffUserId, isAdmin);
        var details = await uow.CheckIns.GetDetailsByFacilityAsync(facilityId, Today);
        return details.Select(ToItem).ToList();
    }

    public async Task CheckInAsync(CheckInRequest request, int staffUserId, bool isAdmin)
    {
        if (!Enum.TryParse<CheckInChannel>(request.Channel, true, out var channel))
            throw new ValidationException(["Kênh check-in không hợp lệ (Phone, QRCode, Manual)."]);

        var detail = await uow.CheckIns.GetDetailForCheckInAsync(request.BookingDetailId)
            ?? throw new NotFoundException("Chi tiết đơn", request.BookingDetailId);

        await EnsureSameFacilityAsync(detail.Court.FacilityId, staffUserId, isAdmin);

        if (detail.Booking.BookingStatus == BookingStatus.Cancelled)
            throw new ValidationException(["Đơn đã bị hủy, không thể check-in."]);
        if (detail.Booking.BookingStatus != BookingStatus.Confirmed)
            throw new ValidationException(["Đơn chưa được thanh toán."]);
        if (detail.PlayDate != Today)
            throw new ValidationException(["Chỉ check-in được đơn của ngày hôm nay."]);
        if (detail.CheckInLogs.Count > 0)
            throw new ConflictException("Khung giờ này đã được check-in.");

        await uow.CheckIns.AddAsync(new CheckInLog
        {
            BookingDetailId = detail.Id,
            ParticipantUserId = detail.Booking.UserId,
            StaffUserId = staffUserId,
            CheckInChannel = channel
        });

        // TODO (khi TV1 thêm BookingStatus.InUse): detail.Booking.BookingStatus = BookingStatus.InUse;
        // TODO (khi TV4 viết xong ReputationService): cộng +2 uy tín cho detail.Booking.UserId

        await uow.SaveChangesAsync();
    }

    private async Task EnsureSameFacilityAsync(int facilityId, int staffUserId, bool isAdmin)
    {
        if (isAdmin) return;
        var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
        if (staffFacilityId != facilityId)
            throw new ForbiddenException("Bạn không được phân công ở cơ sở này.");
    }

    private static CheckInItem ToItem(BookingDetail d) => new(
        d.Id,
        d.Booking.BookingCode,
        d.Booking.User?.FullName ?? d.Booking.GuestName ?? "Khách vãng lai",
        d.Booking.User?.PhoneNumber ?? d.Booking.GuestPhone,
        d.Court.CourtName,
        d.TimeSlot.StartTime,
        d.TimeSlot.EndTime,
        d.Booking.BookingStatus.ToString(),
        d.CheckInLogs.Count > 0,
        d.CheckInLogs.FirstOrDefault()?.CheckInAt);
}
