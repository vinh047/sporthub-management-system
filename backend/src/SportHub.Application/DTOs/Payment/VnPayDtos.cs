using System.Text.Json.Serialization;

namespace SportHub.Application.DTOs.Payment;

public record VnPayPaymentLinkResponse(
    int BookingId,
    string BookingCode,
    string PaymentUrl,
    DateTime ExpiresAt
);

public record VnPayReturnResult(
    bool IsValid,
    bool PaymentReportedSuccessful,
    int? BookingId
);

public record VnPayIpnResponse(
    [property: JsonPropertyName("RspCode")] string RspCode,
    [property: JsonPropertyName("Message")] string Message);

public record VnPayRefundRequest(
    string TransactionReference,
    long Amount,
    string ProviderTransactionId,
    DateTime ProviderTransactionDate,
    string OrderInfo,
    string RequestId,
    string ClientIp,
    string TransactionType
);

public record VnPayRefundResult(
    bool Accepted,
    string? ResponseCode,
    string? ProviderReference,
    string? Message
);
