using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/social-sessions")]
public class SocialSessionsController(ISocialSessionService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? sportId, [FromQuery] decimal? minSkill,
        [FromQuery] decimal? maxSkill, [FromQuery] int? facilityId, [FromQuery] DateOnly? date)
        => Ok(await service.SearchAsync(sportId, facilityId, minSkill, maxSkill, date));

    [HttpGet("facility/{facilityId:int}")]
    public async Task<IActionResult> GetByFacility(int facilityId, [FromQuery] DateOnly? date)
        => Ok(await service.SearchAsync(null, facilityId, null, null, date));

    [HttpGet("manage")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<IActionResult> Manage() => Ok(await service.ManageAsync(RequiredUserId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id) => Ok(await service.GetAsync(id, CurrentUserId));

    [HttpPost]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<IActionResult> Create([FromBody] CreateSocialSessionDto input)
    {
        var result = await service.CreateAsync(input, RequiredUserId);
        return CreatedAtAction(nameof(GetDetail), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateSocialSessionDto input)
        => Ok(await service.UpdateAsync(id, input, RequiredUserId));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public async Task<IActionResult> Cancel(int id)
    {
        await service.CancelAsync(id, RequiredUserId);
        return NoContent();
    }
}
