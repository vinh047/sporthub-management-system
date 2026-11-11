using Microsoft.AspNetCore.Diagnostics;
using SportHub.Application.Common;
using SportHub.Domain.Exceptions;
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

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
            DbUpdateConcurrencyException => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail("Dữ liệu vừa được cập nhật bởi người khác. Vui lòng tải lại và thử lại.")),
            DbUpdateException update when update.InnerException is SqlException { Number: 2601 or 2627 }
                && update.Entries.Any(entry => entry.Entity is Domain.Entities.Tournament.TournamentMatchSet or Domain.Entities.Tournament.TournamentMatch) => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail("Trận đấu hoặc set vừa được người khác ghi nhận. Vui lòng tải lại nhánh đấu.")),
            DbUpdateException { InnerException: SqlException { Number: 1205 } } => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail("Có thao tác đồng thời. Vui lòng tải lại và thử lại.")),
            SqlException { Number: 1205 } => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail("Có thao tác đồng thời. Vui lòng tải lại và thử lại.")),
            Domain.Exceptions.ValidationException ve => (
                HttpStatusCode.BadRequest,
                BaseResponse<object>.Fail("Dữ liệu không hợp lệ.", ve.Errors.ToList())),

            NotFoundException nfe => (
                HttpStatusCode.NotFound,
                BaseResponse<object>.Fail(nfe.Message)),

            ConflictException cfe => (
                HttpStatusCode.Conflict,
                BaseResponse<object>.Fail(cfe.Message)),

            UnauthorizedException ue => (
                HttpStatusCode.Unauthorized,
                BaseResponse<object>.Fail(ue.Message)),

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
