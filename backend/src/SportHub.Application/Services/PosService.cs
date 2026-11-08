using SportHub.Application.DTOs.Pos;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using BookingEntity = SportHub.Domain.Entities.Booking.Booking;

namespace SportHub.Application.Services;

public class PosService(IUnitOfWork uow, IPricingService pricing) : IPosService
{
    public async Task<PosBookingResponse> CreateBookingAsync(PosBookingRequest request, int staffUserId, bool isAdmin)
    {
        var errors = new List<string>();
        if (request.TimeSlotIds.Count == 0) errors.Add("Chọn ít nhất 1 khung giờ.");
        if (request.TimeSlotIds.Distinct().Count() != request.TimeSlotIds.Count) errors.Add("Khung giờ bị chọn trùng.");
        if (string.IsNullOrWhiteSpace(request.GuestName)) errors.Add("Nhập tên khách.");
        if (string.IsNullOrWhiteSpace(request.GuestPhone)) errors.Add("Nhập số điện thoại khách.");
        if (request.PlayDate < DateOnly.FromDateTime(DateTime.Now)) errors.Add("Không đặt được ngày trong quá khứ.");
        if (errors.Count > 0) throw new ValidationException(errors);

        var court = await uow.Courts.GetByIdAsync(request.CourtId)
            ?? throw new NotFoundException("Sân", request.CourtId);
        if (!court.IsActive)
            throw new ValidationException(["Sân đang ngừng hoạt động."]);

        // Staff chỉ bán sân của cơ sở mình
        if (!isAdmin)
        {
            var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            if (staffFacilityId != court.FacilityId)
                throw new ForbiddenException("Bạn không được phân công ở cơ sở này.");
        }

        var slotPrices = new Dictionary<int, decimal>();
        foreach (var slotId in request.TimeSlotIds)
        {
            if (!await uow.Bookings.IsSlotAvailableAsync(court.Id, request.PlayDate, slotId))
                throw new ConflictException($"Khung giờ {slotId} vừa có người đặt hoặc đang bảo trì.");
            slotPrices.Add(slotId,
                await pricing.CalculateSlotPriceAsync(court.Id, request.PlayDate, slotId));
        }

        var total = slotPrices.Values.Sum();
        var booking = new BookingEntity
        {
            BookingCode = $"POS{DateTime.Now:yyMMddHHmmss}",
            GuestName = request.GuestName.Trim(),
            GuestPhone = request.GuestPhone.Trim(),
            TotalAmount = total,
            FinalAmount = total,
            BookingStatus = BookingStatus.Confirmed,   // POS thu tiền tại quầy nên xác nhận ngay
            CreatedByStaffId = staffUserId
        };

        foreach (var slotId in request.TimeSlotIds)
        {
            booking.Details.Add(new BookingDetail
            {
                CourtId = court.Id,
                PlayDate = request.PlayDate,
                TimeSlotId = slotId,
                SlotPrice = slotPrices[slotId]
            });
        }

        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            PaymentMethodId = request.PaymentMethodId,
            Amount = total,
            Status = PaymentStatus.Confirmed,
            ProcessedAt = DateTime.UtcNow,
            StaffVerifierId = staffUserId
        });

        // EF lưu Booking + Details + PaymentTransaction trong cùng 1 transaction
        await uow.Bookings.AddAsync(booking);
        await uow.SaveChangesAsync();

        return new PosBookingResponse(booking.Id, booking.BookingCode, total);
    }
}
