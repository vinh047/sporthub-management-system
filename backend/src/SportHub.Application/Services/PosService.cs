using SportHub.Application.DTOs.Pos;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;
using BookingEntity = SportHub.Domain.Entities.Booking.Booking;

namespace SportHub.Application.Services;

public class PosService(
    IUnitOfWork uow,
    IPricingService pricing,
    ICourtStatusNotifier? courtStatusNotifier = null) : IPosService
{
    public async Task<List<PosCustomerDto>> SearchCustomersAsync(string keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword) || keyword.Trim().Length < 2)
            return [];

        var users = await uow.Users.SearchByPhoneOrNameAsync(keyword.Trim());
        return users.Select(u => new PosCustomerDto(
            u.Id,
            u.FullName,
            u.PhoneNumber,
            u.PlayerProfile?.CurrentTier ?? "Bronze",
            u.PlayerProfile?.LoyaltyPoints ?? 0,
            u.PlayerProfile?.ReputationScore ?? 100
        )).ToList();
    }

    public async Task<PosBookingResponse> CreateBookingAsync(PosBookingRequest request, int staffUserId, bool isAdmin)
    {
        var errors = new List<string>();
        var today = DateOnly.FromDateTime(DateTime.Now);

        var slotIds = request.TimeSlotIds ?? [];
        if (request.CourtId <= 0)
            errors.Add("Vui lòng chọn sân thi đấu hợp lệ.");
        if (slotIds.Count == 0)
            errors.Add("Chọn ít nhất 1 khung giờ.");
        else
        {
            if (slotIds.Count > 17)
                errors.Add("Không thể đặt quá 17 khung giờ trong một đơn.");
            if (slotIds.Any(id => id <= 0))
                errors.Add("Danh sách khung giờ chứa mã không hợp lệ.");
            if (slotIds.Distinct().Count() != slotIds.Count)
                errors.Add("Khung giờ bị chọn trùng.");
        }

        if (string.IsNullOrWhiteSpace(request.GuestName))
            errors.Add("Nhập tên khách.");
        else if (request.GuestName.Trim().Length is < 2 or > 100)
            errors.Add("Tên khách phải từ 2 đến 100 ký tự.");

        if (string.IsNullOrWhiteSpace(request.GuestPhone))
            errors.Add("Nhập số điện thoại khách.");
        else
        {
            var phoneDigits = new string(request.GuestPhone.Trim().Where(char.IsDigit).ToArray());
            if (phoneDigits.Length is < 9 or > 15)
                errors.Add("Số điện thoại khách không hợp lệ (cần 9–15 chữ số).");
        }

        if (request.PlayDate < today)
            errors.Add("Không đặt được ngày trong quá khứ.");
        else if (request.PlayDate > today.AddDays(90))
            errors.Add("Chỉ hỗ trợ đặt sân tại quầy trước tối đa 90 ngày.");

        if (request.PaymentMethodId <= 0)
            errors.Add("Phương thức thanh toán không hợp lệ.");

        if (errors.Count > 0) throw new ValidationException(errors);

        var court = await uow.Courts.GetByIdAsync(request.CourtId)
            ?? throw new NotFoundException("Sân", request.CourtId);
        if (!court.IsActive)
            throw new ValidationException(["Sân đang ngừng hoạt động."]);

        if (!isAdmin)
        {
            var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            if (staffFacilityId != court.FacilityId)
                throw new ForbiddenException("Bạn không được phân công ở cơ sở này.");
        }

        var allTimeSlots = await uow.Facilities.GetTimeSlotsAsync();
        var resolvedSlotIds = new List<int>();
        var slotPrices = new Dictionary<int, decimal>();

        foreach (var requestedSlotId in slotIds)
        {
            var matchedSlot = allTimeSlots.FirstOrDefault(s => s.Id == requestedSlotId)
                ?? allTimeSlots.FirstOrDefault(s => s.SlotIndex == requestedSlotId)
                ?? throw new NotFoundException("Khung giờ", requestedSlotId);

            var canonicalSlotId = matchedSlot.Id;
            if (!await uow.Bookings.IsSlotAvailableAsync(court.Id, request.PlayDate, canonicalSlotId))
                throw new ConflictException($"Khung giờ {matchedSlot.StartTime:HH\\:mm}–{matchedSlot.EndTime:HH\\:mm} vừa có người đặt hoặc đang bảo trì.");

            resolvedSlotIds.Add(canonicalSlotId);
            slotPrices[canonicalSlotId] = await pricing.CalculateSlotPriceAsync(court.Id, request.PlayDate, canonicalSlotId);
        }

        var total = slotPrices.Values.Sum();
        var booking = new BookingEntity
        {
            BookingCode = $"POS{DateTime.Now:yyMMddHHmmss}",
            UserId = request.CustomerUserId > 0 ? request.CustomerUserId : null,
            GuestName = (request.GuestName ?? string.Empty).Trim(),
            GuestPhone = (request.GuestPhone ?? string.Empty).Trim(),
            TotalAmount = total,
            FinalAmount = total,
            BookingStatus = BookingStatus.Confirmed,
            CreatedByStaffId = staffUserId
        };

        foreach (var slotId in resolvedSlotIds)
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

        await uow.Bookings.AddAsync(booking);
        await uow.SaveChangesAsync();

        // Nếu gắn với tài khoản thành viên đã đăng ký -> cộng điểm tích lũy & lưu lịch sử ngay
        if (booking.UserId.HasValue && total > 0m)
        {
            var profile = await uow.CheckIns.GetOrCreatePlayerProfileAsync(booking.UserId.Value);
            if (profile is not null)
            {
                var earnedPoints = Math.Max(1, (int)Math.Floor(total / 10000m));
                profile.LoyaltyPoints += earnedPoints;
                profile.CurrentTier = profile.LoyaltyPoints switch
                {
                    >= 1000 => "Platinum",
                    >= 500 => "Gold",
                    >= 200 => "Silver",
                    _ => "Bronze"
                };

                await uow.CheckIns.AddLoyaltyHistoryAsync(new LoyaltyHistory
                {
                    UserId = booking.UserId.Value,
                    PointsChanged = earnedPoints,
                    Reason = $"Đặt sân & thanh toán tại quầy POS ({booking.BookingCode})",
                    RelatedBookingId = booking.Id,
                    CreatedAt = DateTime.UtcNow
                });
                await uow.SaveChangesAsync();
            }
        }

        if (courtStatusNotifier is not null)
        {
            foreach (var slotId in resolvedSlotIds)
            {
                await courtStatusNotifier.NotifySlotUpdatedAsync(
                    court.FacilityId,
                    court.Id,
                    request.PlayDate,
                    slotId,
                    "Confirmed");
            }
        }

        return new PosBookingResponse(booking.Id, booking.BookingCode, total);
    }
}
