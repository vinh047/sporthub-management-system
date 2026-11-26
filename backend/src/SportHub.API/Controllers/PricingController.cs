using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class PricingController(IPricingService pricingService) : ApiControllerBase
{
    [HttpPost("policies")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse>> UpsertPolicy(
        [FromBody] UpsertPricePolicyRequest request)
    {
        await pricingService.UpsertPricePolicyAsync(request);
        return Ok(BaseResponse.Ok("Cập nhật bảng giá thành công."));
    }

    [HttpGet("slot")]
    public async Task<ActionResult<BaseResponse<decimal>>> GetSlotPrice(
        [FromQuery] int courtId, [FromQuery] DateOnly playDate, [FromQuery] int timeSlotId)
    {
        var price = await pricingService.CalculateSlotPriceAsync(courtId, playDate, timeSlotId);
        return Ok(BaseResponse<decimal>.Ok(price));
    }

    [HttpGet("slot-breakdown")]
    public async Task<ActionResult<BaseResponse<SlotPriceBreakdownResponse>>> GetSlotPriceBreakdown(
        [FromQuery] int courtId, [FromQuery] DateOnly playDate, [FromQuery] int timeSlotId)
        => Ok(BaseResponse<SlotPriceBreakdownResponse>.Ok(
            await pricingService.GetSlotPriceBreakdownAsync(courtId, playDate, timeSlotId)));
}
