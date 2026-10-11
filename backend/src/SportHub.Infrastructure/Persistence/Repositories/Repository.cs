using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;

namespace SportHub.Infrastructure.Persistence.Repositories;

/// <summary>
/// Generic repository cung cấp các thao tác CRUD cơ bản trên DbSet
/// </summary>
public class Repository<T>(SportHubDbContext context) : IRepository<T> where T : class
{
    protected readonly SportHubDbContext _context = context;
    protected readonly DbSet<T> _dbSet = context.Set<T>();

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.ToListAsync();
    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);
    public void Update(T entity) => _dbSet.Update(entity);
    public void Remove(T entity) => _dbSet.Remove(entity);
}
