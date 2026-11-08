using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Payment;

namespace SportHub.Application.Interfaces.Services;

public interface IPaymentService
{
    Task<VnPayPaymentLinkResponse> CreateVnPayPaymentAsync(
        int bookingId,
        int userId,
        string clientIp,
        CancellationToken cancellationToken = default);

    Task<VnPayIpnResponse> ProcessVnPayIpnAsync(
        IReadOnlyDictionary<string, string> parameters,
        string clientIp,
        CancellationToken cancellationToken = default);

    Task<VnPayReturnResult> ValidateVnPayReturnAsync(
        IReadOnlyDictionary<string, string> parameters,
        CancellationToken cancellationToken = default);

    Task<BookingPaymentStatusResponse> GetBookingPaymentStatusAsync(
        int bookingId,
        int userId,
        CancellationToken cancellationToken = default);

    Task<BookingPaymentStatusResponse> ProcessCancellationRefundAsync(
        int bookingId,
        int userId,
        string clientIp,
        CancellationToken cancellationToken = default);
}
