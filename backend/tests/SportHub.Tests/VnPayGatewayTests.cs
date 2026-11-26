using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SportHub.Application.DTOs.Payment;
using SportHub.Infrastructure.Payments;

namespace SportHub.Tests;

public sealed class VnPayGatewayTests
{
    [Fact]
    public void Ipn_response_uses_vnpay_property_names()
    {
        var json = JsonSerializer.Serialize(new VnPayIpnResponse("97", "Invalid signature"));
        using var document = JsonDocument.Parse(json);

        Assert.Equal("97", document.RootElement.GetProperty("RspCode").GetString());
        Assert.Equal("Invalid signature", document.RootElement.GetProperty("Message").GetString());
    }

    [Fact]
    public void Payment_url_contains_a_valid_signature_and_rejects_tampered_amount()
    {
        var gateway = CreateGateway(new RecordingHandler(_ =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK))));
        var paymentUrl = gateway.CreatePaymentUrl(
            "SH-TEST-REFERENCE",
            12500000,
            "Booking SH-BOOKING",
            "127.0.0.1",
            DateTime.UtcNow,
            DateTime.UtcNow.AddMinutes(10));
        var query = System.Web.HttpUtility.ParseQueryString(new Uri(paymentUrl).Query);
        var parameters = query.AllKeys
            .Where(key => key is not null)
            .ToDictionary(key => key!, key => query[key!] ?? string.Empty, StringComparer.Ordinal);

        Assert.True(gateway.IsValidSignature(parameters));
        parameters["vnp_Amount"] = "1";
        Assert.False(gateway.IsValidSignature(parameters));
    }

    [Fact]
    public async Task Refund_uses_partial_refund_command_and_verifies_provider_response_signature()
    {
        Dictionary<string, string>? requestParameters = null;
        var responseParameters = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_ResponseId"] = "response-1",
            ["vnp_Command"] = "refund",
            ["vnp_ResponseCode"] = "00",
            ["vnp_Message"] = "Accepted",
            ["vnp_TmnCode"] = "TESTTMN"
        };
        responseParameters["vnp_SecureHash"] = SignParameters(responseParameters, "test-secret");
        var responseJson = JsonSerializer.Serialize(responseParameters);
        var handler = new RecordingHandler(async request =>
        {
            requestParameters = JsonSerializer.Deserialize<Dictionary<string, string>>(
                await request.Content!.ReadAsStringAsync())!;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        });
        var gateway = CreateGateway(handler);

        var result = await gateway.RefundAsync(new VnPayRefundRequest(
            "payment-reference",
            500000,
            "provider-transaction",
            DateTime.UtcNow.AddHours(-1),
            "Refund booking",
            "refund-request",
            "127.0.0.1",
            "03"));

        Assert.True(result.Accepted);
        Assert.Equal("response-1", result.ProviderReference);
        Assert.NotNull(requestParameters);
        Assert.Equal("03", requestParameters["vnp_TransactionType"]);
        Assert.Equal("500000", requestParameters["vnp_Amount"]);
        Assert.Equal(
            SignRefundRequest(requestParameters, "test-secret"),
            requestParameters["vnp_SecureHash"]);
    }

    private static VnPayGateway CreateGateway(HttpMessageHandler handler)
        => new(new HttpClient(handler), Options.Create(new VnPayOptions
        {
            TmnCode = "TESTTMN",
            HashSecret = "test-secret",
            PaymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
            RefundUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
            ReturnUrl = "https://merchant.example/api/payment/vnpay/return",
            IpnUrl = "https://merchant.example/api/payment/vnpay/ipn"
        }));

    private static string SignParameters(IReadOnlyDictionary<string, string> parameters, string secret)
    {
        var data = string.Join("&", parameters
            .Where(parameter => parameter.Key is not ("vnp_SecureHash" or "vnp_SecureHashType"))
            .OrderBy(parameter => parameter.Key, StringComparer.Ordinal)
            .Select(parameter =>
                $"{WebUtility.UrlEncode(parameter.Key)}={WebUtility.UrlEncode(parameter.Value)}"));
        return Convert.ToHexStringLower(HMACSHA512.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(data)));
    }

    private static string SignRefundRequest(IReadOnlyDictionary<string, string> parameters, string secret)
        => Convert.ToHexStringLower(HMACSHA512.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(string.Join('|',
                parameters["vnp_RequestId"],
                parameters["vnp_Version"],
                parameters["vnp_Command"],
                parameters["vnp_TmnCode"],
                parameters["vnp_TransactionType"],
                parameters["vnp_TxnRef"],
                parameters["vnp_Amount"],
                parameters["vnp_TransactionNo"],
                parameters["vnp_TransactionDate"],
                parameters["vnp_CreateBy"],
                parameters["vnp_CreateDate"],
                parameters["vnp_IpAddr"],
                parameters["vnp_OrderInfo"]))));

    private sealed class RecordingHandler(
        Func<HttpRequestMessage, Task<HttpResponseMessage>> sendAsync) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => sendAsync(request);
    }
}
