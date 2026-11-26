namespace SportHub.Application.DTOs.Report;

public record FacilityRevenueBreakdown(
    int FacilityId,
    string FacilityName,
    decimal BookingRevenue,
    decimal TournamentRevenue,
    decimal SocialRevenue,
    decimal TotalRevenue,
    decimal PeakHourRevenue,
    decimal OffPeakRevenue,
    int TotalBookings,
    int BookedSlotsCount
);
