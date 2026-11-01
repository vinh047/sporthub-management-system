using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SportHub.Application.Common;
using SportHub.Application.DTOs.Health;

namespace SportHub.API.Controllers;

[Route("api/health")]
[AllowAnonymous]
public class CheckHealthController(HealthCheckService healthCheckService) : ApiControllerBase
{
    /// <summary>Kiểm tra trạng thái API và kết nối database. Trả 200 nếu ổn, 503 nếu có thành phần lỗi.</summary>
    [HttpGet]
    public async Task<ActionResult<BaseResponse<HealthCheckResponse>>> Check(CancellationToken cancellationToken)
    {
        var report = await healthCheckService.CheckHealthAsync(cancellationToken);

        var data = new HealthCheckResponse(
            report.Status.ToString(),
            report.TotalDuration.TotalMilliseconds,
            DateTime.UtcNow,
            report.Entries.Select(e => new HealthCheckEntry(
                e.Key,
                e.Value.Status.ToString(),
                e.Value.Description,
                e.Value.Duration.TotalMilliseconds)).ToList());

        if (report.Status == HealthStatus.Healthy)
            return Ok(BaseResponse<HealthCheckResponse>.Ok(data, "Hệ thống hoạt động bình thường."));

        return StatusCode(StatusCodes.Status503ServiceUnavailable, new BaseResponse<HealthCheckResponse>
        {
            Success = false,
            Message = "Một số thành phần của hệ thống đang gặp sự cố.",
            Data = data
        });
    }
}
