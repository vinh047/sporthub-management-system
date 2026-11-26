using SportHub.Application.DTOs.Social;

namespace SportHub.Application.Interfaces.Services;

public interface ISocialTicketService
{
    Task<IReadOnlyList<SocialPaymentMethodDto>> PaymentMethodsAsync();
    Task<SocialTicketDto> ReserveAsync(int sessionId, int userId, ReserveSocialTicketDto input);
    Task<IReadOnlyList<SocialTicketDto>> MyTicketsAsync(int userId);
    Task<SocialCancellationQuoteDto> QuoteAsync(int ticketId, int userId);
    Task<SocialTicketDto> CancelAsync(int ticketId, int userId);
    // Trusted server-side payment adapter only; never expose as a player endpoint.
    Task ConfirmPaidAsync(int transactionId, decimal verifiedAmount, string referenceCode);
}
