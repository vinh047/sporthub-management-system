namespace SportHub.Application.DTOs.Payment;

public record TournamentVnPayReturnResult(bool IsValid, bool PaymentReportedSuccessful, int? TournamentId, int? TeamId);
