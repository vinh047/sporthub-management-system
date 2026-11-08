
using Microsoft.OpenApi;

namespace SportHub.API.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerDocumentation(
        this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();

        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "SportHub API",
                Version = "v1",
                Description = "Hệ thống Quản lý Cụm Sân Thể Thao SportHub"
            });

            // Khai báo phương thức xác thực JWT Bearer
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Nhập Access Token JWT (không cần gõ chữ 'Bearer ')."
            });

            // Áp dụng JWT cho các API trong Swagger
            options.AddSecurityRequirement(document =>
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                });
        });

        return services;
    }

    public static IApplicationBuilder UseSwaggerDocumentation(
        this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "SportHub API v1");
                c.RoutePrefix = "swagger";
            });
        }

        return app;
    }
}
