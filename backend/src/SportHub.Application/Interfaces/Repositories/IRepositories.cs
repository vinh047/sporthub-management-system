using SportHub.Domain.Entities.Auth;

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

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByPhoneNumberAsync(string phoneNumber);
    Task<User?> GetWithProfileAsync(int userId);
}

public interface IBookingRepository : IRepository<Domain.Entities.Booking.Booking>
{
    Task<Domain.Entities.Booking.Booking?> GetByCodeAsync(string bookingCode);
    Task<IEnumerable<Domain.Entities.Booking.Booking>> GetUserBookingsAsync(int userId);
    Task<bool> IsSlotAvailableAsync(int courtId, DateOnly playDate, int timeSlotId);
}

public interface ICourtRepository : IRepository<Domain.Entities.Facility.Court>
{
    Task<IEnumerable<Domain.Entities.Facility.Court>> GetAvailableCourtsAsync(
        int facilityId, int sportId, DateOnly date);
}

public interface ISocialSessionRepository : IRepository<Domain.Entities.Social.SocialSession>
{
    Task<IEnumerable<Domain.Entities.Social.SocialSession>> GetByFacilityAsync(int facilityId, DateOnly? date);
    Task<IEnumerable<Domain.Entities.Social.SocialSession>> SearchAsync(int? sportId, decimal? minSkill, decimal? maxSkill);
}

public interface ITournamentRepository : IRepository<Domain.Entities.Tournament.Tournament>
{
    Task<IEnumerable<Domain.Entities.Tournament.Tournament>> GetByFacilityAsync(int facilityId);
    Task<Domain.Entities.Tournament.Tournament?> GetWithMatchesAsync(int tournamentId);
}

/// <summary>Generic repository interface</summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
}
