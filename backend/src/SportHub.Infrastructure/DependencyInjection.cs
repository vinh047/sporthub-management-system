using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Infrastructure.BackgroundJobs;
using SportHub.Infrastructure.Identity;
using SportHub.Infrastructure.Persistence;
using SportHub.Infrastructure.Persistence.Repositories;

namespace SportHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // EF Core — SQL Server
        services.AddDbContext<SportHubDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(SportHubDbContext).Assembly.FullName)));

        // Unit of Work & Repositories
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<ICourtRepository, CourtRepository>();
        services.AddScoped<ISocialSessionRepository, SocialSessionRepository>();
        services.AddScoped<ITournamentRepository, TournamentRepository>();

        // JWT
        services.AddSingleton<IJwtTokenProvider, JwtTokenProvider>();

        // Background Jobs
        services.AddHostedService<HoldSlotExpiryJob>();
        services.AddHostedService<NoShowScannerJob>();

        return services;
    }
}
