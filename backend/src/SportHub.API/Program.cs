using Serilog;
using SportHub.API.Extensions;
using SportHub.API.Hubs;
using SportHub.API.Middleware;
using SportHub.Application;
using SportHub.Application.Interfaces.Services;
using SportHub.Application.Services;
using SportHub.Infrastructure;
using SportHub.Infrastructure.Persistence.Seed;



var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddScoped<IStaffProfileService, StaffProfileService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPlayerProfileService, PlayerProfileService>();


// Clean Architecture Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// ── Build App ────────────────────────────────────────────────
var app = builder.Build();

// Dữ liệu nền cho Development: vai trò, tài khoản Admin/Staff mẫu
if (app.Environment.IsDevelopment())
    await app.Services.SeedDevelopmentDataAsync();

// Global Exception Handler
app.UseMiddleware<GlobalExceptionHandler>();

// Swagger UI (Development)
app.UseSwaggerDocumentation();

app.UseSerilogRequestLogging();

// Chỉ chuyển HTTPS trong môi trường Production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseFrontendCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR Hubs
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<CourtStatusHub>("/hubs/courts");

Log.Information("🚀 SportHub API started successfully");
app.Run();
