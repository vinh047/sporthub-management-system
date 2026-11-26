using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.Payment;

namespace SportHub.Application.Interfaces.Repositories;

public interface ISocialTicketRepository
{
    Task<SocialParticipant?> GetAsync(int id);
    Task<IReadOnlyList<SocialParticipant>> ListByUserAsync(int userId);
    Task<IReadOnlyList<PaymentMethod>> ListOnlineMethodsAsync();
    Task<PaymentMethod?> GetPaymentMethodAsync(int id);
    Task<PaymentTransaction?> GetPaymentAsync(int ticketId);
    Task<PaymentTransaction?> GetPaymentByIdAsync(int id);
    Task AddTicketAsync(SocialParticipant ticket);
    Task AddPaymentAsync(PaymentTransaction payment);
}
