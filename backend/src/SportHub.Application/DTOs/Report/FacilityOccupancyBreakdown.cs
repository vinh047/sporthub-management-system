namespace SportHub.Application.DTOs.Report;

public record FacilityOccupancyBreakdown(
    int FacilityId,
    string FacilityName,
    int ActiveCourtsCount,
    int TotalSlots,
    int OccupiedSlots,
    double OccupancyRate,
    int PeakTotalSlots,
    int PeakOccupiedSlots,
    double PeakOccupancyRate
);
