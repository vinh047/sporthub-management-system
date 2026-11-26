namespace SportHub.Application.DTOs.CheckIn;

public record ReceptionPaymentDto(
    int TransactionId,
    string MethodName,
    string TransactionType,
    decimal Amount,
    string Status,
    string? ReferenceCode,
    DateTime CreatedAt,
    DateTime? ProcessedAt,
    string? VerifiedByStaffName
);
