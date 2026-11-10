namespace SportHub.Application.DTOs.Report;

public record SportOccupancyBreakdown(
    int SportId,
    string SportName,
    int ActiveCourtsCount,
    int TotalSlots,
    int OccupiedSlots,
    double OccupancyRate,
    int PeakTotalSlots,
    int PeakOccupiedSlots,
    double PeakOccupancyRate
);
