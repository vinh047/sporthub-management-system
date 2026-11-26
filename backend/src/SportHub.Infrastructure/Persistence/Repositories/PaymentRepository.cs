using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PaymentRepository(SportHubDbContext context)
    : Repository<PaymentTransaction>(context), IPaymentRepository
{
    public async Task<PaymentTransaction?> GetLatestPaymentForTournamentTeamAsync(int teamId)
        => await _dbSet.Include(t => t.PaymentMethod)
            .Where(t => t.TournamentTeamId == teamId && t.TransactionType == PaymentTransactionType.Payment)
            .OrderByDescending(t => t.Status == PaymentStatus.Confirmed)
            .ThenByDescending(t => t.Status == PaymentStatus.Pending)
            .ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .FirstOrDefaultAsync();

    public async Task<PaymentMethod?> GetMethodByCodeAsync(string methodCode)
        => await _context.PaymentMethods
            .FirstOrDefaultAsync(method => method.MethodCode == methodCode && method.IsActive);

    public async Task<PaymentTransaction?> GetByReferenceCodeAsync(string referenceCode)
        => await _dbSet
            .Include(transaction => transaction.Booking)
            .Include(transaction => transaction.PaymentMethod)
            .Include(transaction => transaction.TournamentTeam)
            .FirstOrDefaultAsync(transaction => transaction.ReferenceCode == referenceCode);

    public async Task<PaymentTransaction?> GetLatestPaymentForBookingAsync(int bookingId)
        => await _dbSet
            .Where(transaction =>
                transaction.BookingId == bookingId &&
                transaction.TransactionType == PaymentTransactionType.Payment)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task<PaymentTransaction?> GetRefundForPaymentAsync(int paymentTransactionId)
        => await _dbSet.FirstOrDefaultAsync(transaction =>
            transaction.RelatedTransactionId == paymentTransactionId &&
            transaction.TransactionType == PaymentTransactionType.Refund);

    public async Task<PaymentTransaction?> GetSuccessfulVnPayPaymentForBookingAsync(int bookingId)
        => await _dbSet
            .Include(transaction => transaction.PaymentMethod)
            .Where(transaction =>
                transaction.BookingId == bookingId &&
                transaction.TransactionType == PaymentTransactionType.Payment &&
                transaction.Status == PaymentStatus.Confirmed &&
                transaction.PaymentMethod.MethodCode == "VNPAY")
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefaultAsync();
}
