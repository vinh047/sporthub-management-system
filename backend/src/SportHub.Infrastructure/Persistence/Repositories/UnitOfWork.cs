using Microsoft.EntityFrameworkCore.Storage;
using SportHub.Application.Interfaces.Repositories;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class UnitOfWork(SportHubDbContext context) : IUnitOfWork
{
    private IDbContextTransaction? _transaction;

    public IUserRepository Users { get; } = new UserRepository(context);
    public IBookingRepository Bookings { get; } = new BookingRepository(context);
    public ICourtRepository Courts { get; } = new CourtRepository(context);
    public ISocialSessionRepository SocialSessions { get; } = new SocialSessionRepository(context);
    public ITournamentRepository Tournaments { get; } = new TournamentRepository(context);

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync()
        => _transaction = await context.Database.BeginTransactionAsync();

    public async Task CommitTransactionAsync()
    {
        if (_transaction is not null) await _transaction.CommitAsync();
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction is not null) await _transaction.RollbackAsync();
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        context.Dispose();
    }
}
