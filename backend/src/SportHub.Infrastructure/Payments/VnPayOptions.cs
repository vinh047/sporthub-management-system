namespace SportHub.Infrastructure.Payments;

public sealed class VnPayOptions
{
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public string RefundUrl { get; set; } = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    public string ReturnUrl { get; set; } = string.Empty;
    public string IpnUrl { get; set; } = string.Empty;
    public string Version { get; set; } = "2.1.0";
}
