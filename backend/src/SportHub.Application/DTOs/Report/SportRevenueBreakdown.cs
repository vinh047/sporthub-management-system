namespace SportHub.Application.DTOs.Report;

public record SportRevenueBreakdown(
    int SportId,
    string SportName,
    decimal BookingRevenue,
    decimal TournamentRevenue,
    decimal SocialRevenue,
    decimal TotalRevenue,
    decimal PeakHourRevenue,
    decimal OffPeakRevenue,
    int TotalBookings,
    int BookedSlotsCount
);
