using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class PaymentRepository(SportHubDbContext context)
    : Repository<PaymentTransaction>(context), IPaymentRepository
{
    public async Task<PaymentMethod?> GetMethodByCodeAsync(string methodCode)
        => await _context.PaymentMethods
            .FirstOrDefaultAsync(method => method.MethodCode == methodCode && method.IsActive);

    public async Task<PaymentTransaction?> GetByReferenceCodeAsync(string referenceCode)
        => await _dbSet
            .Include(transaction => transaction.Booking)
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
