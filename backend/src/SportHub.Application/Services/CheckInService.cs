using SportHub.Application.DTOs.Booking;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;

namespace SportHub.Application.Services;

public class CheckInService(IUnitOfWork uow, IReputationService reputation) : ICheckInService
{
    public Task CheckInAsync(CheckInRequest request, int staffUserId) => throw new NotImplementedException();
}
