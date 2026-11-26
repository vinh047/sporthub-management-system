namespace SportHub.Application.DTOs.Report;

public record RevenueReportResponse(
    int FacilityId,
    string FacilityName,
    DateOnly From,
    DateOnly To,
    decimal TotalRevenue,
    int TotalBookings,
    List<DailyRevenue> DailyBreakdown,
    int? SportId = null,
    string? SportName = null,
    decimal BookingRevenue = 0m,
    decimal TournamentRevenue = 0m,
    decimal SocialRevenue = 0m,
    decimal PeakHourRevenue = 0m,
    decimal OffPeakRevenue = 0m,
    int TotalBookedSlots = 0,
    int PeakBookedSlots = 0,
    List<FacilityRevenueBreakdown>? FacilityBreakdown = null,
    List<SportRevenueBreakdown>? SportBreakdown = null,
    List<TimeSlotRevenueBreakdown>? PeakHourBreakdown = null
);
