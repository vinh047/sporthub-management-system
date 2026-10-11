using Serilog;
using SportHub.API.Extensions;
using SportHub.API.Hubs;
using SportHub.API.Middleware;
using SportHub.Application;
using SportHub.Infrastructure;

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

// Clean Architecture Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// ── Build App ────────────────────────────────────────────────
var app = builder.Build();

// Global Exception Handler
app.UseMiddleware<GlobalExceptionHandler>();

// Swagger UI (Development)
app.UseSwaggerDocumentation();

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseFrontendCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR Hubs
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<CourtStatusHub>("/hubs/courts");

Log.Information("🚀 SportHub API started successfully");
app.Run();
