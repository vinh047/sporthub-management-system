using SportHub.Application.DTOs.Payment;

namespace SportHub.Application.Interfaces.Services;

public interface IVnPayGateway
{
    string CreatePaymentUrl(
        string transactionReference,
        long amount,
        string orderInfo,
        string clientIp,
        DateTime createdAt,
        DateTime expiresAt);

    bool IsValidSignature(IReadOnlyDictionary<string, string> parameters);

    Task<VnPayRefundResult> RefundAsync(
        VnPayRefundRequest request,
        CancellationToken cancellationToken = default);
}
