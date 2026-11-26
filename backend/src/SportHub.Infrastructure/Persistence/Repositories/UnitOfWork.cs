
using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SportHub.Application.Interfaces.Repositories;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class UnitOfWork(SportHubDbContext context) : IUnitOfWork
{
    private IDbContextTransaction? _transaction;

    // User và Profile
    public IUserRepository Users { get; } = new UserRepository(context);
    public IStaffProfileRepository StaffProfiles { get; } = new StaffProfileRepository(context);
    public IPlayerProfileRepository PlayerProfiles { get; } = new PlayerProfileRepository(context);

    // Facility, Court và Pricing
    public IFacilityRepository Facilities { get; } = new FacilityRepository(context);
    public ICourtRepository Courts { get; } = new CourtRepository(context);
    public IPricingRepository Pricing { get; } = new PricingRepository(context);
    public IPromotionRepository Promotions { get; } = new PromotionRepository(context);

    // Booking, Payment và CheckIn
    public IBookingRepository Bookings { get; } = new BookingRepository(context);
    public IPaymentRepository Payments { get; } = new PaymentRepository(context);
    public ICheckInRepository CheckIns { get; } = new CheckInRepository(context);

    // Social và Tournament
    public ISocialSessionRepository SocialSessions { get; } = new SocialSessionRepository(context);
    public ITournamentRepository Tournaments { get; } = new TournamentRepository(context);

    // Report
    public IReportRepository Reports { get; } = new ReportRepository(context);

    // Notification
    public INotificationTemplateRepository NotificationTemplates { get; } =
        new NotificationTemplateRepository(context);

    public IUserNotificationRepository UserNotifications { get; } =
        new UserNotificationRepository(context);

    // Save Changes
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await context.SaveChangesAsync(ct);

    // Transaction
    public async Task BeginTransactionAsync(
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted)
    {
        if (_transaction is not null)
            throw new InvalidOperationException("Transaction đã được bắt đầu.");

        _transaction = await context.Database.BeginTransactionAsync(isolationLevel);
    }

    public async Task CommitTransactionAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    // Dispose
    public void Dispose()
    {
        _transaction?.Dispose();
        context.Dispose();
    }
}
