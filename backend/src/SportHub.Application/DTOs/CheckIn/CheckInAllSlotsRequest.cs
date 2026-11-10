namespace SportHub.Application.DTOs.CheckIn;

public record CheckInAllSlotsRequest(
    string Channel = "Manual"
);
