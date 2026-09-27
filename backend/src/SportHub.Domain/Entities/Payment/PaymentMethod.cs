using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.Payment;

public class PaymentMethod : BaseEntity
{
    public string MethodCode { get; set; } = string.Empty;  // CASH, QR_TRANSFER, MOCK_ONLINE
    public string MethodName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<PaymentTransaction> Transactions { get; set; } = [];
}
