namespace SportHub.Application.DTOs.Report;

public record DailyRevenue(
    DateOnly Date,
    decimal Revenue,
    int BookingCount,
    decimal PeakHourRevenue = 0m,
    decimal OffPeakRevenue = 0m,
    int OccupiedSlots = 0
);
