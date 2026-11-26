using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/tournaments/{tournamentId:int}/bracket")]
public class TournamentBracketController(ITournamentBracketService service) : ApiControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<BaseResponse<TournamentBracketDto>>> Get(int tournamentId)
        => Ok(BaseResponse<TournamentBracketDto>.Ok(await service.GetAsync(tournamentId)));

    [HttpPost]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse<TournamentBracketDto>>> Generate(int tournamentId)
        => Ok(BaseResponse<TournamentBracketDto>.Ok(await service.GenerateAsync(tournamentId, RequiredUserId, CurrentUserRole == "ADMIN")));

    [HttpPut("matches/{matchId:int}/sets/{setNumber:int}")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<ActionResult<BaseResponse<TournamentBracketDto>>> RecordSet(int tournamentId, int matchId, int setNumber,
        [FromBody] RecordTournamentSetRequest request)
        => Ok(BaseResponse<TournamentBracketDto>.Ok(await service.RecordSetAsync(tournamentId, matchId, setNumber, request,
            RequiredUserId, CurrentUserRole == "ADMIN")));
}
