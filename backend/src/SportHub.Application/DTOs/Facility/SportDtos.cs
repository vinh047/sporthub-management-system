namespace SportHub.Application.DTOs.Facility;

public record SportResponse(int Id, string SportCode, string SportName, bool IsActive);

public record SaveSportRequest(string SportCode, string SportName, bool IsActive = true);

public record CreateCourtsRequest(
    int FacilityId,
    int SportId,
    string NamePrefix,
    int Count,
    string CourtType);
