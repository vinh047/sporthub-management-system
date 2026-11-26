namespace SportHub.Application.DTOs.CheckIn;

public record CheckoutBookingRequest(
    int? PaymentMethodId = null,
    string? Note = null
);
