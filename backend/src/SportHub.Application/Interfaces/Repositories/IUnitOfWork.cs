namespace SportHub.Application.Interfaces.Repositories;

/// <summary>Unit of Work — commit tất cả thay đổi trong 1 transaction</summary>
public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IBookingRepository Bookings { get; }
    ICourtRepository Courts { get; }
    ISocialSessionRepository SocialSessions { get; }
    ITournamentRepository Tournaments { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
