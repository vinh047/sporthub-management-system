using Microsoft.AspNetCore.Diagnostics;
using SportHub.Application.Common;
using SportHub.Domain.Exceptions;
using System.Net;
using System.Text.Json;

namespace SportHub.API.Middleware;

/// <summary>
/// Global exception handler — bắt tất cả exception và trả về BaseResponse chuẩn.
/// Thành viên không cần try/catch trong Controller hay Service.
/// </summary>
public class GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, response) = ex switch
        {
            Domain.Exceptions.ValidationException ve => (
                HttpStatusCode.BadRequest,
                BaseResponse<object>.Fail("Dữ liệu không hợp lệ.", ve.Errors.ToList())),

            NotFoundException nfe => (
                HttpStatusCode.NotFound,
                BaseResponse<object>.Fail(nfe.Message)),

            ConflictException cfe => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail(cfe.Message)),

            ForbiddenException ffe => (
                HttpStatusCode.Forbidden,
                BaseResponse<object>.Fail(ffe.Message)),

            DomainException de => (
                HttpStatusCode.BadRequest,
                BaseResponse<object>.Fail(de.Message)),

            _ => (
                HttpStatusCode.InternalServerError,
                BaseResponse<object>.Fail("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."))
        };

        context.Response.StatusCode = (int)statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
