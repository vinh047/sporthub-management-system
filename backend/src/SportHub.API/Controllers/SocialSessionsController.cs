
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Social;

namespace SportHub.API.Controllers;

[ApiController]
[Route("api/social-sessions")]
public class SocialSessionsController(
    ISocialSessionRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? sportId,
        [FromQuery] decimal? minSkill,
        [FromQuery] decimal? maxSkill)
    {
        if (minSkill.HasValue && maxSkill.HasValue &&
            minSkill.Value > maxSkill.Value)
        {
            return BadRequest("Invalid skill range.");
        }

        var sessions = await repository.SearchAsync(
            sportId, minSkill, maxSkill);

        return Ok(sessions.Select(MapToDto));
    }

    [HttpGet("facility/{facilityId:int}")]
    public async Task<IActionResult> GetByFacility(
        int facilityId,
        [FromQuery] DateOnly? date)
    {
        if (facilityId <= 0)
            return BadRequest("Invalid facility ID.");

        var sessions = await repository.GetByFacilityAsync(
            facilityId, date);

        return Ok(sessions.Select(MapToDto));
    }

    private static SocialSessionListItemDto MapToDto(
        SocialSession session)
    {
        return new SocialSessionListItemDto
        {
            Id = session.Id,
            Title = session.Title,
            FacilityId = session.FacilityId,
            SportId = session.SportId,
            PlayDate = session.PlayDate,
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            MaxParticipants = session.MaxParticipants,
            FeePerSlot = session.FeePerSlot,
            MinSkill = session.MinSkill,
            MaxSkill = session.MaxSkill,
            Status = session.Status,
            RegisteredCount = session.Participants.Count(
                p => p.Status == "Confirmed" ||
                     p.Status == "CheckedIn")
        };
    }
}
