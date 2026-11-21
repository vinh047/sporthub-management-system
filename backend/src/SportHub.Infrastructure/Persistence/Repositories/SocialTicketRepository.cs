using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Social;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class SocialTicketRepository(SportHubDbContext db) : ISocialTicketRepository
{
    public Task<SocialParticipant?> GetAsync(int id) => db.SocialParticipants
        .Include(x => x.Session).FirstOrDefaultAsync(x => x.Id == id);
    public async Task<IReadOnlyList<SocialParticipant>> ListByUserAsync(int userId) => await db.SocialParticipants
        .AsNoTracking().Include(x => x.Session).Where(x => x.UserId == userId)
        .OrderByDescending(x => x.RegisteredAt).ToListAsync();
    public async Task<IReadOnlyList<PaymentMethod>> ListOnlineMethodsAsync() => await db.PaymentMethods.AsNoTracking()
        .Where(x => x.IsActive && (x.MethodCode == "MOCK_ONLINE" || x.MethodCode == "QR_TRANSFER"))
        .OrderBy(x => x.MethodName).ToListAsync();
    public Task<PaymentMethod?> GetPaymentMethodAsync(int id) => db.PaymentMethods
        .FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
    public Task<PaymentTransaction?> GetPaymentAsync(int ticketId) => db.PaymentTransactions
        .Include(x => x.PaymentMethod).SingleOrDefaultAsync(x => x.SocialParticipantId == ticketId);
    public Task<PaymentTransaction?> GetPaymentByIdAsync(int id) => db.PaymentTransactions
        .Include(x => x.PaymentMethod).FirstOrDefaultAsync(x => x.Id == id && x.SocialParticipantId != null);
    public async Task AddTicketAsync(SocialParticipant ticket) => await db.SocialParticipants.AddAsync(ticket);
    public async Task AddPaymentAsync(PaymentTransaction payment) => await db.PaymentTransactions.AddAsync(payment);
}
