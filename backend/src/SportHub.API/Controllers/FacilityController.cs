using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class FacilityController(IFacilityService facilityService) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BaseResponse<IEnumerable<FacilityResponse>>>> GetAll()
    {
        var result = await facilityService.GetAllFacilitiesAsync();
        return Ok(BaseResponse<IEnumerable<FacilityResponse>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BaseResponse<FacilityDetailResponse>>> GetById(int id)
    {
        var result = await facilityService.GetFacilityDetailAsync(id);
        return Ok(BaseResponse<FacilityDetailResponse>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<FacilityResponse>>> Create([FromBody] CreateFacilityRequest request)
    {
        var result = await facilityService.CreateFacilityAsync(request);
        return StatusCode(201, BaseResponse<FacilityResponse>.Ok(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<FacilityResponse>>> Update(int id, [FromBody] UpdateFacilityRequest request)
    {
        var result = await facilityService.UpdateFacilityAsync(id, request);
        return Ok(BaseResponse<FacilityResponse>.Ok(result));
    }
}
