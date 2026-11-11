
using Serilog;
using SportHub.API.Extensions;
using SportHub.API.Hubs;
using SportHub.API.Middleware;
using SportHub.Application;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Infrastructure;
using SportHub.Infrastructure.Data;
using SportHub.Infrastructure.Persistence.Seed;

var seedRequested = args.Any(argument =>
    string.Equals(argument, "--seed", StringComparison.OrdinalIgnoreCase));

var builder = WebApplication.CreateBuilder(args.Where(argument =>
    !string.Equals(argument, "--seed", StringComparison.OrdinalIgnoreCase)).ToArray());

// ── Serilog ──────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/sporthub-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// ── Services ─────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.ConfigureApiBehavior();
builder.Services.AddSwaggerDocumentation();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddApiHealthChecks();

// Clean Architecture Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Profile Services
builder.Services.AddScoped<IStaffProfileService, StaffProfileService>();
builder.Services.AddScoped<IPlayerProfileService, PlayerProfileService>();

// SignalR Notifiers
builder.Services.AddSingleton<ICourtStatusNotifier, SignalRCourtStatusNotifier>();
builder.Services.AddSingleton<ITournamentNotifier, SignalRTournamentNotifier>();

// ── Build App ────────────────────────────────────────────────
var app = builder.Build();

// Seed database khi chạy với --seed
if (seedRequested)
{
    await DbSeeder.SeedAsync(app.Services);

    if (app.Environment.IsDevelopment())
        await app.Services.SeedDevelopmentDataAsync();

    Log.Information("Database seeding completed. Exiting without starting the API.");

    await app.DisposeAsync();
    return;
}

// Dữ liệu nền cho Development
if (app.Environment.IsDevelopment())
{
    await app.Services.SeedDevelopmentDataAsync();
}

// Global Exception Handler
app.UseMiddleware<GlobalExceptionHandler>();

// Swagger UI
app.UseSwaggerDocumentation();

app.UseSerilogRequestLogging();

// HTTPS configuration
var configuredUrls = builder.Configuration["urls"] ?? string.Empty;

var hasHttpsEndpoint = configuredUrls
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Any(url =>
        Uri.TryCreate(url, UriKind.Absolute, out var endpoint) &&
        endpoint.Scheme == Uri.UriSchemeHttps);

if (!app.Environment.IsDevelopment() ||
    hasHttpsEndpoint ||
    !string.IsNullOrWhiteSpace(builder.Configuration["HTTPS_PORT"]) ||
    !string.IsNullOrWhiteSpace(builder.Configuration["ASPNETCORE_HTTPS_PORT"]))
{
    app.UseHttpsRedirection();
}

app.UseFrontendCors();

app.UseAuthentication();
app.UseAuthorization();

// Controllers
app.MapControllers();

// SignalR Hubs
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<TournamentHub>("/hubs/tournaments");
app.MapHub<CourtStatusHub>("/hubs/courts");
app.MapHub<CourtStatusHub>("/hubs/court-status");

// Start API
Log.Information("🚀 SportHub API started successfully");

app.Run();
