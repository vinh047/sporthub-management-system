using System.Data;

namespace SportHub.Application.Interfaces.Repositories;

/// <summary>Unit of Work — commit tất cả thay đổi trong 1 transaction</summary>
public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IStaffProfileRepository StaffProfiles { get; }
    IPlayerProfileRepository PlayerProfiles { get; }
    IFacilityRepository Facilities { get; }
    IPromotionRepository Promotions { get; }
    IBookingRepository Bookings { get; }
    IPaymentRepository Payments { get; }
    ICourtRepository Courts { get; }
    IPricingRepository Pricing { get; }
    ISocialSessionRepository SocialSessions { get; }
    ITournamentRepository Tournaments { get; }
    ICheckInRepository CheckIns { get; }
    INotificationTemplateRepository NotificationTemplates { get; }
    IUserNotificationRepository UserNotifications { get; }
    IReportRepository Reports { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(IsolationLevel isolationLevel = IsolationLevel.ReadCommitted);
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
