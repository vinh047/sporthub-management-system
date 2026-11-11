namespace SportHub.Application.DTOs.Report;

public record CourtOccupancy(
    int CourtId,
    string CourtName,
    int TotalSlots,
    int OccupiedSlots,
    int FacilityId = 0,
    string FacilityName = "",
    int SportId = 0,
    string SportName = "",
    double OccupancyRate = 0,
    int PeakTotalSlots = 0,
    int PeakOccupiedSlots = 0,
    double PeakOccupancyRate = 0
);
