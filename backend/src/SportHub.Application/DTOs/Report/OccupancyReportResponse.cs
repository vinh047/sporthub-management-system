namespace SportHub.Application.DTOs.Report;

public record OccupancyReportResponse(
    int FacilityId,
    DateOnly Date,
    int TotalSlots,
    int OccupiedSlots,
    double OccupancyRate,
    List<CourtOccupancy> CourtBreakdown,
    string FacilityName = "Tất cả cơ sở",
    DateOnly? From = null,
    DateOnly? To = null,
    int? SportId = null,
    string? SportName = null,
    int PeakTotalSlots = 0,
    int PeakOccupiedSlots = 0,
    double PeakOccupancyRate = 0,
    int OffPeakTotalSlots = 0,
    int OffPeakOccupiedSlots = 0,
    double OffPeakOccupancyRate = 0,
    List<FacilityOccupancyBreakdown>? FacilityBreakdown = null,
    List<SportOccupancyBreakdown>? SportBreakdown = null,
    List<TimeSlotOccupancyBreakdown>? HourlyBreakdown = null
);
