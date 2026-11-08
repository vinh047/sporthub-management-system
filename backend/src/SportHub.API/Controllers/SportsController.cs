using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class SportsController(IFacilityService facilityService) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BaseResponse<IEnumerable<SportResponse>>>> GetActive()
        => Ok(BaseResponse<IEnumerable<SportResponse>>.Ok(
            await facilityService.GetActiveSportsAsync()));

    [HttpGet("manage")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<IEnumerable<SportResponse>>>> GetAll()
        => Ok(BaseResponse<IEnumerable<SportResponse>>.Ok(
            await facilityService.GetSportsAsync()));

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<SportResponse>>> Create(
        [FromBody] SaveSportRequest request)
    {
        var sport = await facilityService.CreateSportAsync(request);
        return StatusCode(201, BaseResponse<SportResponse>.Ok(sport));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<SportResponse>>> Update(
        int id, [FromBody] SaveSportRequest request)
        => Ok(BaseResponse<SportResponse>.Ok(
            await facilityService.UpdateSportAsync(id, request)));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse>> Delete(int id)
    {
        await facilityService.DeleteSportAsync(id);
        return Ok(BaseResponse.Ok("Đã ngừng hoạt động bộ môn."));
    }
}
