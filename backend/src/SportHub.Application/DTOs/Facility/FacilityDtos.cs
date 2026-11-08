namespace SportHub.Application.DTOs.Facility;

// --- Facility ---
public record CreateFacilityRequest(
    string Name,
    string Address,
    string Hotline,
    TimeOnly OpenTime,
    TimeOnly CloseTime
);

public record UpdateFacilityRequest(
    string? Name,
    string? Address,
    string? Hotline,
    TimeOnly? OpenTime,
    TimeOnly? CloseTime,
    bool? IsActive
);

public record FacilityResponse(
    int Id,
    string Name,
    string Address,
    string Hotline,
    TimeOnly OpenTime,
    TimeOnly CloseTime,
    bool IsActive
);

public record FacilityDetailResponse(
    int Id,
    string Name,
    string Address,
    string Hotline,
    TimeOnly OpenTime,
    TimeOnly CloseTime,
    bool IsActive,
    List<CourtSummary> Courts
);

// --- Court ---
public record CreateCourtRequest(
    int FacilityId,
    int SportId,
    string CourtName,
    string CourtType    // Indoor, Outdoor
);

public record CourtResponse(
    int Id,
    int FacilityId,
    int SportId,
    string SportName,
    string CourtName,
    string CourtType,
    bool IsActive
);

public record CourtSummary(int Id, string CourtName, string SportName, bool IsActive);

public record CourtAvailabilityResponse(
    int CourtId,
    string CourtName,
    List<SlotAvailability> Slots
);

public record SlotAvailability(
    int TimeSlotId,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool IsAvailable,
    bool IsPeakHour,
    decimal Price
);

public record LockCourtRequest(
    int CourtId,
    DateOnly MaintenanceDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Reason
);

// --- Pricing ---
public record UpsertPricePolicyRequest(
    int FacilityId,
    int SportId,
    decimal BasePrice,
    decimal WeekendSurchargePercent,
    DateOnly EffectiveFrom,
    List<PriceRuleDetailDto> Rules
);

public record PriceRuleDetailDto(
    int TimeSlotId,
    decimal HourlyRate,
    bool IsPeakHour
);
