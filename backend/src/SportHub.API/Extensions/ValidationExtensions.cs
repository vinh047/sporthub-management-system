using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Common;

namespace SportHub.API.Extensions;

public static class ValidationExtensions
{
    public static IServiceCollection ConfigureApiBehavior(this IServiceCollection services)
    {
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .Where(m => !string.IsNullOrWhiteSpace(m))
                    .ToList();

                var response = BaseResponse<object>.Fail("Dữ liệu gửi lên không hợp lệ.", errors);
                return new BadRequestObjectResult(response);
            };
        });

        return services;
    }
}
