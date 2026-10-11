using Microsoft.AspNetCore.Mvc;
using SportHub.Domain.Exceptions;
using System.Security.Claims;

namespace SportHub.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected int? CurrentUserId
    {
        get
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idClaim, out var id) ? id : null;
        }
    }

    protected int RequiredUserId
    {
        get
        {
            return CurrentUserId ?? throw new ForbiddenException("Không thể xác định danh tính người dùng. Vui lòng đăng nhập lại.");
        }
    }

    protected string? CurrentUserRole => User.FindFirstValue(ClaimTypes.Role);
}
