namespace SportHub.Application.DTOs.CheckIn;

public record CollectBookingPaymentRequest(
    int PaymentMethodId,
    decimal? Amount = null,
    string? ReferenceCode = null
);
