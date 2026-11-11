namespace SportHub.Application.DTOs.Pos;

public record PosCustomerDto(
    int UserId,
    string FullName,
    string PhoneNumber,
    string CurrentTier,
    int LoyaltyPoints,
    int ReputationScore
);
