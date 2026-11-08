using SportHub.API.HealthChecks;

namespace SportHub.API.Extensions;

public static class HealthCheckExtensions
{
    public static IServiceCollection AddApiHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database", tags: ["db"]);

        return services;
    }
}
