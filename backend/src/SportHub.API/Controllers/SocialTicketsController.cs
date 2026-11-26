using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Authorize(Roles = "PLAYER")]
[Route("api/social-tickets")]
public class SocialTicketsController(ISocialTicketService service) : ApiControllerBase
{
    [HttpGet("payment-methods")]
    public async Task<IActionResult> PaymentMethods() => Ok(await service.PaymentMethodsAsync());

    [HttpPost("reserve/{sessionId:int}")]
    public async Task<IActionResult> Reserve(int sessionId, [FromBody] ReserveSocialTicketDto input)
        => StatusCode(201, await service.ReserveAsync(sessionId, RequiredUserId, input));
    [HttpGet("mine")]
    public async Task<IActionResult> Mine() => Ok(await service.MyTicketsAsync(RequiredUserId));
    [HttpGet("{id:int}/cancellation-quote")]
    public async Task<IActionResult> Quote(int id) => Ok(await service.QuoteAsync(id, RequiredUserId));
    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id) => Ok(await service.CancelAsync(id, RequiredUserId));
}
