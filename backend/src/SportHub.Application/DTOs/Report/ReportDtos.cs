namespace SportHub.Application.DTOs.Report;

public record RevenueReportResponse(
    int FacilityId,
    string FacilityName,
    DateOnly From,
    DateOnly To,
    decimal TotalRevenue,
    int TotalBookings,
    List<DailyRevenue> DailyBreakdown
);

public record DailyRevenue(
    DateOnly Date,
    decimal Revenue,
    int BookingCount
);

public record OccupancyReportResponse(
    int FacilityId,
    DateOnly Date,
    int TotalSlots,
    int OccupiedSlots,
    double OccupancyRate,
    List<CourtOccupancy> CourtBreakdown
);

public record CourtOccupancy(
    int CourtId,
    string CourtName,
    int TotalSlots,
    int OccupiedSlots
);
