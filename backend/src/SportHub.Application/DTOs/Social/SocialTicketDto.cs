namespace SportHub.Application.DTOs.Social;

public record SocialPaymentMethodDto(int Id, string MethodCode, string MethodName);
public record ReserveSocialTicketDto(int? PaymentMethodId);
public record SocialTicketDto(int Id, int SessionId, string SessionTitle, string Status,
    decimal PaidAmount, decimal Fee, DateTime RegisteredAt, DateTime? HoldExpiresAtUtc,
    int? PaymentTransactionId, string? PaymentStatus);
public record SocialCancellationQuoteDto(bool CanCancel, decimal? RefundAmount, string Message);
