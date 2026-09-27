using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.System;

public class SystemAuditLog : BaseEntity
{
    public int UserId { get; set; }
    public string ActionCode { get; set; } = string.Empty;      // CREATE, UPDATE, DELETE
    public string TargetTable { get; set; } = string.Empty;
    public int RecordId { get; set; }
    public string? OldData { get; set; }                        // JSON snapshot
    public string? NewData { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Auth.User User { get; set; } = null!;
}
