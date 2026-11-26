using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Infrastructure.Payments;

public sealed class VnPayGateway(HttpClient httpClient, IOptions<VnPayOptions> options) : IVnPayGateway
{
    private static readonly TimeZoneInfo VietnamTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    private readonly VnPayOptions _options = options.Value;

    public string CreatePaymentUrl(
        string transactionReference,
        long amount,
        string orderInfo,
        string clientIp,
        DateTime createdAt,
        DateTime expiresAt)
    {
        EnsurePaymentConfiguration();
        EnsureHttpsUrl(_options.PaymentUrl, nameof(_options.PaymentUrl));
        EnsureHttpsUrl(_options.ReturnUrl, nameof(_options.ReturnUrl));
        EnsurePublicIpnUrl();

        var localCreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(createdAt, DateTimeKind.Utc), VietnamTimeZone);
        var localExpiresAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(expiresAt, DateTimeKind.Utc), VietnamTimeZone);
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = amount.ToString(CultureInfo.InvariantCulture),
            ["vnp_Command"] = "pay",
            ["vnp_CreateDate"] = localCreatedAt.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_ExpireDate"] = localExpiresAt.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_IpAddr"] = NormalizeIpAddress(clientIp),
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = _options.ReturnUrl,
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_TxnRef"] = transactionReference,
            ["vnp_Version"] = _options.Version
        };
        var hashData = BuildEncodedParameterString(parameters);
        var secureHash = ComputeHmac(hashData, _options.HashSecret);
        var query = BuildEncodedParameterString(parameters.Append(
            new KeyValuePair<string, string>("vnp_SecureHash", secureHash)));

        return $"{_options.PaymentUrl}?{query}";
    }

    public bool IsValidSignature(IReadOnlyDictionary<string, string> parameters)
    {
        if (string.IsNullOrWhiteSpace(_options.HashSecret) ||
            !parameters.TryGetValue("vnp_SecureHash", out var suppliedHash) ||
            string.IsNullOrWhiteSpace(suppliedHash))
            return false;

        if (!parameters.TryGetValue("vnp_TmnCode", out var tmnCode) ||
            !string.Equals(tmnCode, _options.TmnCode, StringComparison.Ordinal))
            return false;

        var valuesToSign = parameters
            .Where(parameter =>
                parameter.Key.StartsWith("vnp_", StringComparison.Ordinal) &&
                parameter.Key is not ("vnp_SecureHash" or "vnp_SecureHashType") &&
                !string.IsNullOrEmpty(parameter.Value))
            .OrderBy(parameter => parameter.Key, StringComparer.Ordinal);
        var hashData = BuildEncodedParameterString(valuesToSign);
        var expectedHash = ComputeHmac(hashData, _options.HashSecret);

        try
        {
            return CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(expectedHash),
                Convert.FromHexString(suppliedHash));
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public async Task<VnPayRefundResult> RefundAsync(
        VnPayRefundRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsurePaymentConfiguration();
        EnsureHttpsUrl(_options.RefundUrl, nameof(_options.RefundUrl));

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);
        var localTransactionDate = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(request.ProviderTransactionDate, DateTimeKind.Utc),
            VietnamTimeZone);
        var refundParameters = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_RequestId"] = request.RequestId,
            ["vnp_Version"] = _options.Version,
            ["vnp_Command"] = "refund",
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_TransactionType"] = request.TransactionType,
            ["vnp_TxnRef"] = request.TransactionReference,
            ["vnp_Amount"] = request.Amount.ToString(CultureInfo.InvariantCulture),
            ["vnp_OrderInfo"] = request.OrderInfo,
            ["vnp_TransactionNo"] = request.ProviderTransactionId,
            ["vnp_TransactionDate"] = localTransactionDate.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CreateBy"] = "SportHub",
            ["vnp_CreateDate"] = localNow.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_IpAddr"] = NormalizeIpAddress(request.ClientIp)
        };
        var signatureData = string.Join('|',
            refundParameters["vnp_RequestId"],
            refundParameters["vnp_Version"],
            refundParameters["vnp_Command"],
            refundParameters["vnp_TmnCode"],
            refundParameters["vnp_TransactionType"],
            refundParameters["vnp_TxnRef"],
            refundParameters["vnp_Amount"],
            refundParameters["vnp_TransactionNo"],
            refundParameters["vnp_TransactionDate"],
            refundParameters["vnp_CreateBy"],
            refundParameters["vnp_CreateDate"],
            refundParameters["vnp_IpAddr"],
            refundParameters["vnp_OrderInfo"]);
        refundParameters["vnp_SecureHash"] = ComputeHmac(signatureData, _options.HashSecret);

        using var response = await httpClient.PostAsJsonAsync(
            _options.RefundUrl,
            refundParameters,
            cancellationToken);
        response.EnsureSuccessStatusCode();

        using var responseDocument = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
        var responseParameters = responseDocument.RootElement
            .EnumerateObject()
            .Where(property => property.Value.ValueKind == JsonValueKind.String)
            .ToDictionary(
                property => property.Name,
                property => property.Value.GetString() ?? string.Empty,
                StringComparer.Ordinal);

        if (!IsValidSignature(responseParameters))
            throw new InvalidDataException("VNPay refund response signature is invalid.");

        responseParameters.TryGetValue("vnp_ResponseCode", out var responseCode);
        responseParameters.TryGetValue("vnp_Message", out var message);
        responseParameters.TryGetValue("vnp_ResponseId", out var providerReference);

        return new VnPayRefundResult(
            string.Equals(responseCode, "00", StringComparison.Ordinal),
            responseCode,
            providerReference,
            message);
    }

    private void EnsurePaymentConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.TmnCode) ||
            string.IsNullOrWhiteSpace(_options.HashSecret) ||
            string.IsNullOrWhiteSpace(_options.PaymentUrl))
            throw new InvalidOperationException("VNPay chưa được cấu hình đầy đủ. Hãy thiết lập VNPay:TmnCode, VNPay:HashSecret và VNPay:PaymentUrl bằng biến môi trường hoặc User Secrets.");
    }

    private void EnsurePublicIpnUrl()
    {
        EnsureHttpsUrl(_options.IpnUrl, nameof(_options.IpnUrl));
        var host = new Uri(_options.IpnUrl).Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Contains("YOUR-", StringComparison.OrdinalIgnoreCase) ||
            !host.Contains('.', StringComparison.Ordinal))
            throw new InvalidOperationException("VNPay:IpnUrl phải là URL HTTPS công khai mà VNPay có thể truy cập.");

    }

    private static void EnsureHttpsUrl(string value, string settingName)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException($"Cấu hình VNPay:{settingName} phải là URL HTTPS tuyệt đối hợp lệ.");
    }

    private static string NormalizeIpAddress(string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
            return "127.0.0.1";

        return ipAddress.Length <= 45 ? ipAddress : ipAddress[..45];
    }

    private static string BuildEncodedParameterString(IEnumerable<KeyValuePair<string, string>> parameters)
        => string.Join("&", parameters
            .OrderBy(parameter => parameter.Key, StringComparer.Ordinal)
            .Select(parameter =>
                $"{WebUtility.UrlEncode(parameter.Key)}={WebUtility.UrlEncode(parameter.Value)}"));

    private static string ComputeHmac(string data, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        return Convert.ToHexStringLower(HMACSHA512.HashData(keyBytes, dataBytes));
    }
}
