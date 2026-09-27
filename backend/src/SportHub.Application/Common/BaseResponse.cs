namespace SportHub.Application.Common;

/// <summary>
/// Wrapper chuẩn cho toàn bộ API response.
/// Frontend luôn nhận về cùng 1 format.
/// </summary>
public class BaseResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    public static BaseResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static BaseResponse<T> Fail(string message, List<string>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors };
}

/// <summary>
/// Dành cho các response không có data (void operations).
/// </summary>
public class BaseResponse : BaseResponse<object>
{
    public static BaseResponse Ok(string? message = null) =>
        new() { Success = true, Message = message };

    public static new BaseResponse Fail(string message, List<string>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors };
}

/// <summary>
/// Wrapper cho danh sách có phân trang.
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
