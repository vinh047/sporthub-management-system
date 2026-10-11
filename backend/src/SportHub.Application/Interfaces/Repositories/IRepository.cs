namespace SportHub.Application.Interfaces.Repositories;

/// <summary>Generic repository interface định nghĩa các thao tác CRUD cơ bản</summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
}
