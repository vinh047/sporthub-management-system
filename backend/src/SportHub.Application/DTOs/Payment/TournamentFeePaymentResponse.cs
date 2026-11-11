namespace SportHub.Application.DTOs.Payment;

public record TournamentFeePaymentResponse(
    int TransactionId,
    int TournamentId,
    string TournamentName,
    int TeamId,
    string TeamName,
    string TeamStatus,
    decimal Amount,
    string PaymentMethodCode,
    string PaymentStatus,
    string? ReferenceCode,
    string? PaymentUrl,
    DateTime CreatedAt,
    DateTime? ProcessedAt
);

