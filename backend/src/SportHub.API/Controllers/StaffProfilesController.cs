
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Auth;
using SportHub.Application.DTOs.Staff;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
[Authorize(Roles = "ADMIN")]
public class StaffProfilesController(
    IStaffProfileService staffProfileService) : ApiControllerBase
{
    // GET: api/StaffProfiles
    [HttpGet]
    public async Task<ActionResult<BaseResponse<IEnumerable<StaffProfileResponse>>>>
        GetAll()
    {
        var result = await staffProfileService.GetAllAsync();

        return Ok(BaseResponse<IEnumerable<StaffProfileResponse>>.Ok(result));
    }

    // GET: api/StaffProfiles/5
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<BaseResponse<StaffProfileResponse>>>
        GetByUserId(int userId)
    {
        var result = await staffProfileService.GetByUserIdAsync(userId);

        return Ok(BaseResponse<StaffProfileResponse>.Ok(result));
    }

    // POST: api/StaffProfiles
    [HttpPost]
    public async Task<ActionResult<BaseResponse<StaffProfileResponse>>>
        Create([FromBody] CreateStaffProfileRequest request)
    {
        var result = await staffProfileService.CreateAsync(request);

        return StatusCode(
            201,
            BaseResponse<StaffProfileResponse>.Ok(
                result,
                "Tạo nhân viên thành công!"));
    }

    // PUT: api/StaffProfiles/5
    [HttpPut("{userId:int}")]
    public async Task<ActionResult<BaseResponse<StaffProfileResponse>>>
        Update(
            int userId,
            [FromBody] UpdateStaffProfileRequest request)
    {
        var result = await staffProfileService.UpdateAsync(userId, request);

        return Ok(BaseResponse<StaffProfileResponse>.Ok(
            result,
            "Cập nhật nhân viên thành công!"));
    }

    // DELETE: api/StaffProfiles/5
    [HttpDelete("{userId:int}")]
    public async Task<ActionResult<BaseResponse>> Delete(int userId)
    {
        await staffProfileService.DeleteAsync(userId);

        return Ok(BaseResponse.Ok("Vô hiệu hóa nhân viên thành công!"));
    }
}
