namespace SportHub.Application.DTOs.Payment;

public record TournamentVnPayPaymentLinkResponse(
    int TeamId,
    int TournamentId,
    string TeamName,
    decimal Amount,
    string ReferenceCode,
    string PaymentUrl,
    DateTime ExpiresAt
);
