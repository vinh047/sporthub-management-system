using SportHub.Domain.Common;

namespace SportHub.Domain.Entities.System;

public class SystemSetting : BaseEntity
{
    public string ParamKey { get; set; } = string.Empty;        // HOLD_DURATION_MINUTES, MIN_REPUTATION_BOOKING
    public string ParamValue { get; set; } = string.Empty;
    public string? Description { get; set; }
}
