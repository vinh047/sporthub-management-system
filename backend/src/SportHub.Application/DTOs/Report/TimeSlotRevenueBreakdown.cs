namespace SportHub.Application.DTOs.Report;

public record TimeSlotRevenueBreakdown(
    int TimeSlotId,
    string StartTime,
    string EndTime,
    bool IsPeakHour,
    decimal Revenue,
    int BookedCount
);
