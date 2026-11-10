namespace SportHub.Application.DTOs.Report;

public record TimeSlotOccupancyBreakdown(
    int TimeSlotId,
    string StartTime,
    string EndTime,
    bool IsPeakHour,
    int TotalSlots,
    int OccupiedSlots,
    double OccupancyRate
);
