using SportHub.Application.DTOs.Pos;

namespace SportHub.Application.Interfaces.Services;

public interface IPosService
{
    Task<PosBookingResponse> CreateBookingAsync(PosBookingRequest request, int staffUserId, bool isAdmin);
}
