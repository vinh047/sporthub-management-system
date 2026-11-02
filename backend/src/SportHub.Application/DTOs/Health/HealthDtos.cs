namespace SportHub.Application.DTOs.Health;

public record HealthCheckResponse(
    string Status,              // Healthy, Degraded, Unhealthy
    double TotalDurationMs,
    DateTime CheckedAt,
    List<HealthCheckEntry> Checks
);

public record HealthCheckEntry(
    string Name,
    string Status,
    string? Description,
    double DurationMs
);
