using SportHub.Application.DTOs.Payment;

namespace SportHub.Application.Interfaces.Services;

public interface ITournamentPaymentService
{
    Task<TournamentVnPayPaymentLinkResponse> CreateVnPayPaymentAsync(int tournamentId, int teamId, int userId, string clientIp, CancellationToken cancellationToken = default);
    Task<TournamentFeePaymentResponse?> GetPaymentStatusAsync(int tournamentId, int teamId, int userId, CancellationToken cancellationToken = default);
    Task<VnPayIpnResponse> ProcessVnPayIpnAsync(IReadOnlyDictionary<string, string> parameters, CancellationToken cancellationToken = default);
    Task<TournamentVnPayReturnResult> ValidateVnPayReturnAsync(IReadOnlyDictionary<string, string> parameters, CancellationToken cancellationToken = default);
}
