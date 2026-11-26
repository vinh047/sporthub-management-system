using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/player-ratings")]
public sealed class PlayerRatingsController(IPlayerRatingService ratings) : ApiControllerBase
{
    [HttpGet("mine")]
    [Authorize(Roles = "PLAYER")]
    public async Task<IActionResult> Mine(CancellationToken ct) =>
        Ok(await ratings.GetMyDashboardAsync(RequiredUserId, ct));

    // Controlled admin operation. It does NOT set tournament match results.
    [HttpPost("tournament-matches/{matchId:int}/calculate")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Calculate(int matchId, CancellationToken ct) =>
        Ok(await ratings.ApplyTournamentMatchAsync(matchId, ct));
}
