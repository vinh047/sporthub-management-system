using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Infrastructure.BackgroundJobs;
using SportHub.Infrastructure.Identity;
using SportHub.Infrastructure.Payments;
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
        services.AddSingleton<IOptions<VnPayOptions>>(Options.Create(new VnPayOptions
        {
            TmnCode = configuration["VNPay:TmnCode"] ?? string.Empty,
            HashSecret = configuration["VNPay:HashSecret"] ?? string.Empty,
            PaymentUrl = configuration["VNPay:PaymentUrl"] ?? string.Empty,
            RefundUrl = configuration["VNPay:RefundUrl"] ?? "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
            ReturnUrl = configuration["VNPay:ReturnUrl"] ?? string.Empty,
            IpnUrl = configuration["VNPay:IpnUrl"] ?? string.Empty,
            Version = configuration["VNPay:Version"] ?? "2.1.0"
        }));
        services.AddSingleton(new HttpClient());
        services.AddScoped<IVnPayGateway, VnPayGateway>();

        // Unit of Work & Repositories
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IFacilityRepository, FacilityRepository>();
        services.AddScoped<IPromotionRepository, PromotionRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ICourtRepository, CourtRepository>();
        services.AddScoped<ISocialSessionRepository, SocialSessionRepository>();
        services.AddScoped<ITournamentRepository, TournamentRepository>();
        services.AddScoped<ICheckInRepository, CheckInRepository>();

        // JWT & mật khẩu
        services.AddSingleton<IJwtTokenProvider, JwtTokenProvider>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();

        // Background Jobs
        services.AddHostedService<HoldSlotExpiryJob>();
        services.AddHostedService<NoShowScannerJob>();

        return services;
    }
}
