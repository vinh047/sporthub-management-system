using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/payment")]
public class PaymentController(IPaymentService paymentService, ITournamentPaymentService tournamentPaymentService, IConfiguration configuration) : ApiControllerBase
{
    [HttpPost("tournaments/{tournamentId:int}/teams/{teamId:int}/vnpay")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<TournamentVnPayPaymentLinkResponse>>> CreateTournamentPayment(
        int tournamentId, int teamId, CancellationToken cancellationToken)
    {
        var result = await tournamentPaymentService.CreateVnPayPaymentAsync(tournamentId, teamId, RequiredUserId,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1", cancellationToken);
        return Ok(BaseResponse<TournamentVnPayPaymentLinkResponse>.Ok(result));
    }

    [HttpGet("tournaments/{tournamentId:int}/teams/{teamId:int}/status")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<TournamentFeePaymentResponse?>>> GetTournamentPaymentStatus(
        int tournamentId, int teamId, CancellationToken cancellationToken)
    {
        var result = await tournamentPaymentService.GetPaymentStatusAsync(tournamentId, teamId, RequiredUserId, cancellationToken);
        return Ok(BaseResponse<TournamentFeePaymentResponse?>.Ok(result));
    }

    [HttpPost("bookings/{bookingId:int}/vnpay")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<VnPayPaymentLinkResponse>>> CreateBookingPayment(
        int bookingId,
        CancellationToken cancellationToken)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await paymentService.CreateVnPayPaymentAsync(
            bookingId,
            RequiredUserId,
            clientIp,
            cancellationToken);
        return Ok(BaseResponse<VnPayPaymentLinkResponse>.Ok(result, "Đã tạo liên kết thanh toán VNPay."));
    }

    [HttpGet("bookings/{bookingId:int}/status")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<BookingPaymentStatusResponse>>> GetBookingPaymentStatus(
        int bookingId,
        CancellationToken cancellationToken)
    {
        var result = await paymentService.GetBookingPaymentStatusAsync(
            bookingId,
            RequiredUserId,
            cancellationToken);
        return Ok(BaseResponse<BookingPaymentStatusResponse>.Ok(result));
    }

[HttpGet("vnpay/ipn")]
[AllowAnonymous]
public async Task<ActionResult<VnPayIpnResponse>> HandleVnPayIpn(
    CancellationToken cancellationToken)
{
    Console.WriteLine("========== VNPAY IPN RECEIVED ==========");
    Console.WriteLine($"Time: {DateTime.Now}");
    Console.WriteLine($"URL: {Request.Path}");
    Console.WriteLine($"Query: {Request.QueryString}");

    var parameters = Request.Query.ToDictionary(
        parameter => parameter.Key,
        parameter => parameter.Value.ToString(),
        StringComparer.Ordinal);

    var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? "127.0.0.1";

    var result = IsTournamentReference(parameters)
        ? await tournamentPaymentService.ProcessVnPayIpnAsync(parameters, cancellationToken)
        : await paymentService.ProcessVnPayIpnAsync(parameters, clientIp, cancellationToken);

    Console.WriteLine($"IPN RESPONSE: {result.RspCode}");

    return Ok(result);
}

    [HttpGet("vnpay/return")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleVnPayReturn(CancellationToken cancellationToken)
    {
        var parameters = Request.Query.ToDictionary(
            parameter => parameter.Key,
            parameter => parameter.Value.ToString(),
            StringComparer.Ordinal);
        if (IsTournamentReference(parameters))
        {
            var tournamentResult = await tournamentPaymentService.ValidateVnPayReturnAsync(parameters, cancellationToken);
            var tournamentUrl = configuration["VNPay:TournamentFrontendReturnUrl"]
                ?? "http://localhost:5173/player/my-tournaments";
            return Redirect(QueryHelpers.AddQueryString(tournamentUrl, new Dictionary<string, string?>
            {
                ["paymentResult"] = !tournamentResult.IsValid ? "invalid" : tournamentResult.PaymentReportedSuccessful ? "processing" : "failed",
                ["tournamentId"] = tournamentResult.TournamentId?.ToString(),
                ["teamId"] = tournamentResult.TeamId?.ToString()
            }));
        }
        var result = await paymentService.ValidateVnPayReturnAsync(parameters, cancellationToken);
        var frontendUrl = configuration["VNPay:FrontendReturnUrl"]
            ?? "http://localhost:5173/player/my-bookings";
        var query = new Dictionary<string, string?>
        {
            ["paymentResult"] = !result.IsValid
                ? "invalid"
                : result.PaymentReportedSuccessful
                    ? "processing"
                    : "failed"
        };
        if (result.BookingId is not null)
            query["bookingId"] = result.BookingId.Value.ToString();

        return Redirect(QueryHelpers.AddQueryString(frontendUrl, query));
    }
    private static bool IsTournamentReference(IReadOnlyDictionary<string, string> parameters)
        => parameters.TryGetValue("vnp_TxnRef", out var reference) && reference.StartsWith("TN", StringComparison.Ordinal);
}
