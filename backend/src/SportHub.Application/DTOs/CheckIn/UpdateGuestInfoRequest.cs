namespace SportHub.Application.DTOs.CheckIn;

public record UpdateGuestInfoRequest(
    string GuestName,
    string GuestPhone
);
