using SportHub.Application.DTOs.Booking;

namespace SportHub.Application.Interfaces.Services;

public interface ICheckInService
{
    Task CheckInAsync(CheckInRequest request, int staffUserId);
}
