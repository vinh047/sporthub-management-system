namespace SportHub.API.Extensions;

public static class CorsExtensions
{
    private const string PolicyName = "AllowFrontend";

    public static IServiceCollection AddFrontendCors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var allowedOrigins = configuration["Cors:AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? ["http://localhost:5173", "http://localhost:3000"];

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()); // Bắt buộc cho SignalR
        });

        return services;
    }

    public static IApplicationBuilder UseFrontendCors(this IApplicationBuilder app)
    {
        return app.UseCors(PolicyName);
    }
}
