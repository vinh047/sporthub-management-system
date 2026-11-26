using SportHub.Application.DTOs.CheckIn;

namespace SportHub.Application.Interfaces.Services;

public interface ICheckInService
{
    Task<List<CheckInItem>> LookupAsync(string keyword, int staffUserId, bool isAdmin);
    Task<List<CheckInItem>> GetTodayAsync(int facilityId, int staffUserId, bool isAdmin);
    Task<List<CheckInHistoryItemDto>> GetHistoryAsync(int facilityId, DateOnly? playDate, int staffUserId, bool isAdmin);
    Task CheckInAsync(CheckInRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> GetBookingOrderAsync(int bookingId, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> CheckInAllSlotsAsync(int bookingId, CheckInAllSlotsRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> UndoSlotCheckInAsync(int bookingDetailId, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> CollectPaymentAtCounterAsync(int bookingId, CollectBookingPaymentRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> CheckoutBookingAsync(int bookingId, CheckoutBookingRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> MarkNoShowAsync(int bookingId, MarkNoShowRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> CancelBookingAtCounterAsync(int bookingId, ReceptionCancelBookingRequest request, int staffUserId, bool isAdmin);
    Task<ReceptionBookingDetailDto> UpdateGuestInfoAsync(int bookingId, UpdateGuestInfoRequest request, int staffUserId, bool isAdmin);
}
