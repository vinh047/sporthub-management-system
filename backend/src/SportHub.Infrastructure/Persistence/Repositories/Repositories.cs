using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.Tournament;
using SportHub.Infrastructure.Persistence;

namespace SportHub.Infrastructure.Persistence.Repositories;

// ===== Generic Repository =====
public class Repository<T>(SportHubDbContext context) : IRepository<T> where T : class
{
    protected readonly DbSet<T> _dbSet = context.Set<T>();

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.ToListAsync();
    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);
    public void Update(T entity) => _dbSet.Update(entity);
    public void Remove(T entity) => _dbSet.Remove(entity);
}

// ===== User Repository =====
public class UserRepository(SportHubDbContext context)
    : Repository<User>(context), IUserRepository
{
    public async Task<User?> GetByPhoneNumberAsync(string phoneNumber)
        => await _dbSet.FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);

    public async Task<User?> GetWithProfileAsync(int userId)
        => await _dbSet
            .Include(u => u.PlayerProfile)
            .Include(u => u.UserRole)
            .FirstOrDefaultAsync(u => u.Id == userId);
}

// ===== Booking Repository =====
public class BookingRepository(SportHubDbContext context)
    : Repository<Domain.Entities.Booking.Booking>(context), IBookingRepository
{
    public async Task<Domain.Entities.Booking.Booking?> GetByCodeAsync(string code)
        => await _dbSet
            .Include(b => b.Details)
            .FirstOrDefaultAsync(b => b.BookingCode == code);

    public async Task<IEnumerable<Domain.Entities.Booking.Booking>> GetUserBookingsAsync(int userId)
        => await _dbSet
            .Where(b => b.UserId == userId)
            .Include(b => b.Details).ThenInclude(d => d.Court).ThenInclude(c => c.Facility)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public async Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId)
    {
        // Slot bị chiếm nếu có Booking ở trạng thái Held hoặc Confirmed
        var occupied = await context.BookingDetails.AnyAsync(d =>
            d.CourtId == courtId &&
            d.PlayDate == playDate &&
            d.TimeSlotId == timeSlotId &&
            (d.Booking.BookingStatus == Domain.Enums.BookingStatus.Held ||
             d.Booking.BookingStatus == Domain.Enums.BookingStatus.Confirmed));

        // Slot bị khóa nếu có bảo trì
        var maintenance = await context.CourtMaintenances.AnyAsync(m =>
            m.CourtId == courtId &&
            m.MaintenanceDate == playDate);

        return !occupied && !maintenance;
    }
}

// ===== Court Repository =====
public class CourtRepository(SportHubDbContext context)
    : Repository<Domain.Entities.Facility.Court>(context), ICourtRepository
{
    public async Task<IEnumerable<Domain.Entities.Facility.Court>> GetAvailableCourtsAsync(
        int facilityId, int sportId, DateOnly date)
        => await _dbSet
            .Where(c => c.FacilityId == facilityId && c.SportId == sportId && c.IsActive)
            .Include(c => c.Sport)
            .ToListAsync();
}

// ===== Social Session Repository =====
public class SocialSessionRepository(SportHubDbContext context)
    : Repository<SocialSession>(context), ISocialSessionRepository
{
    public async Task<IEnumerable<SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date)
    {
        var query = _dbSet.Where(s => s.FacilityId == facilityId && s.Status == "Published");
        if (date.HasValue)
            query = query.Where(s => s.PlayDate == date.Value);
        return await query.Include(s => s.Sport).Include(s => s.Participants).ToListAsync();
    }

    public async Task<IEnumerable<SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill)
    {
        var query = _dbSet.Where(s => s.Status == "Published");
        if (sportId.HasValue) query = query.Where(s => s.SportId == sportId.Value);
        if (minSkill.HasValue) query = query.Where(s => s.MinSkill >= minSkill.Value);
        if (maxSkill.HasValue) query = query.Where(s => s.MaxSkill <= maxSkill.Value);
        return await query.Include(s => s.Participants).ToListAsync();
    }
}

// ===== Tournament Repository =====
public class TournamentRepository(SportHubDbContext context)
    : Repository<Domain.Entities.Tournament.Tournament>(context), ITournamentRepository
{
    public async Task<IEnumerable<Domain.Entities.Tournament.Tournament>> GetByFacilityAsync(int facilityId)
        => await _dbSet.Where(t => t.FacilityId == facilityId)
            .Include(t => t.Sport)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();

    public async Task<Domain.Entities.Tournament.Tournament?> GetWithMatchesAsync(int tournamentId)
        => await _dbSet
            .Include(t => t.Teams).ThenInclude(team => team.Athletes)
            .Include(t => t.Matches)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);
}

// ===== Unit of Work =====
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
