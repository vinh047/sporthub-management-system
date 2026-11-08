using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Promotion;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Controllers;

[Route("api/[controller]")]
public class PromotionController(IPromotionService promotionService) : ApiControllerBase
{
    [HttpGet("active")]
    public async Task<ActionResult<BaseResponse<IEnumerable<PromotionResponse>>>> GetActive()
        => Ok(BaseResponse<IEnumerable<PromotionResponse>>.Ok(
            await promotionService.GetActiveAsync()));

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<BaseResponse<PromotionResponse>>> Create(
        [FromBody] CreatePromotionRequest request)
        => StatusCode(201, BaseResponse<PromotionResponse>.Ok(
            await promotionService.CreateAsync(request)));

    [HttpPost("validate")]
    [Authorize]
    public async Task<ActionResult<BaseResponse<PromotionDiscountResponse>>> Validate(
        [FromBody] ValidatePromotionRequest request)
        => Ok(BaseResponse<PromotionDiscountResponse>.Ok(
            await promotionService.ValidateAsync(request, RequiredUserId)));

    [HttpGet("wallet")]
    [Authorize(Roles = "PLAYER")]
    public async Task<ActionResult<BaseResponse<IEnumerable<UserVoucherResponse>>>> GetWallet()
        => Ok(BaseResponse<IEnumerable<UserVoucherResponse>>.Ok(
            await promotionService.GetWalletAsync(RequiredUserId)));

    [HttpPost("{id:int}/claim")]
    [Authorize(Roles = "PLAYER")]
    public async Task<ActionResult<BaseResponse<UserVoucherResponse>>> Claim(int id)
        => StatusCode(201, BaseResponse<UserVoucherResponse>.Ok(
            await promotionService.ClaimAsync(id, RequiredUserId)));

    [HttpPost("redeem")]
    [Authorize(Roles = "PLAYER")]
    public async Task<ActionResult<BaseResponse<PromotionDiscountResponse>>> Redeem(
        [FromBody] RedeemVoucherRequest request)
        => Ok(BaseResponse<PromotionDiscountResponse>.Ok(
            await promotionService.RedeemAsync(request, RequiredUserId)));
}
