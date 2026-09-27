using Microsoft.Extensions.DependencyInjection;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;

namespace SportHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFacilityService, FacilityService>();
        services.AddScoped<ICourtService, CourtService>();
        services.AddScoped<IPricingService, PricingService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<ICheckInService, CheckInService>();
        services.AddScoped<IMatchRoomService, MatchRoomService>();
        services.AddScoped<IReputationService, ReputationService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IReportService, ReportService>();

        return services;
    }
}
