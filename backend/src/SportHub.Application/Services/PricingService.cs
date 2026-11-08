using SportHub.Application.DTOs.Facility;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PricingService(IUnitOfWork uow) : IPricingService
{
    public async Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        if (courtId <= 0 || timeSlotId <= 0)
            throw new ValidationException(["Sân hoặc khung giờ không hợp lệ."]);

        return await uow.Pricing.GetSlotPriceAsync(courtId, playDate, timeSlotId)
            ?? throw new ValidationException(["Không tìm thấy sân đang hoạt động hoặc chính sách giá cho khung giờ này."]);
    }

    public async Task<IReadOnlyDictionary<int, decimal>> GetSlotPricesAsync(int courtId, DateOnly playDate)
    {
        if (courtId <= 0)
            throw new ValidationException(["Sân không hợp lệ."]);

        var prices = await uow.Pricing.GetSlotPricesAsync(courtId, playDate);
        if (prices.Count == 0)
            throw new ValidationException(["Không tìm thấy sân đang hoạt động hoặc chính sách giá cho ngày này."]);

        return prices;
    }

    public Task UpsertPricePolicyAsync(UpsertPricePolicyRequest request) => throw new NotImplementedException();
}
