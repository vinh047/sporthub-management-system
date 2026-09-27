namespace SportHub.Application.DTOs.MatchRoom;

// --- Requests ---
public record CreateRoomRequest(
    int BookingDetailId,
    int SlotsNeeded,
    string TargetSkillLevel,
    decimal? ShareFeeEstimate,
    DateTime JoinDeadline,
    string? Description
);

public record SearchRoomsRequest(
    int? SportId,
    int? FacilityId,
    DateOnly? Date,
    string? SkillLevel,
    int Page = 1,
    int PageSize = 10
);

// --- Responses ---
public record MatchRoomSummary(
    int Id,
    string FacilityName,
    string SportName,
    DateOnly PlayDate,
    TimeOnly StartTime,
    int SlotsNeeded,
    int SlotsJoined,
    string TargetSkillLevel,
    decimal? ShareFeeEstimate,
    DateTime JoinDeadline,
    string RoomStatus
);

public record MatchRoomResponse(
    int Id,
    string RoomStatus,
    int SlotsNeeded,
    int SlotsJoined
);

public record MatchRoomDetailResponse(
    int Id,
    string FacilityName,
    string FacilityAddress,
    string SportName,
    DateOnly PlayDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int SlotsNeeded,
    int SlotsJoined,
    string TargetSkillLevel,
    decimal? ShareFeeEstimate,
    DateTime JoinDeadline,
    string RoomStatus,
    string? Description,
    HostInfo Host,
    List<MemberInfo> Members
);

public record HostInfo(
    int UserId,
    string FullName,
    int ReputationScore,
    string SkillLevel
);

public record MemberInfo(
    int UserId,
    string FullName,
    int ReputationScore,
    string SkillLevel,
    string MemberStatus
);
