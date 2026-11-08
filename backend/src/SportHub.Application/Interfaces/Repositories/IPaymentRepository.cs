using SportHub.Domain.Entities.Payment;

namespace SportHub.Application.Interfaces.Repositories;

public interface IPaymentRepository : IRepository<PaymentTransaction>
{
    Task<PaymentMethod?> GetMethodByCodeAsync(string methodCode);
    Task<PaymentTransaction?> GetByReferenceCodeAsync(string referenceCode);
    Task<PaymentTransaction?> GetLatestPaymentForBookingAsync(int bookingId);
    Task<PaymentTransaction?> GetRefundForPaymentAsync(int paymentTransactionId);
    Task<PaymentTransaction?> GetSuccessfulVnPayPaymentForBookingAsync(int bookingId);
}
