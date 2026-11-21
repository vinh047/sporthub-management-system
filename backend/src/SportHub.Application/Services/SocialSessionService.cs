using System.Data;
using SportHub.Application.DTOs.Social;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class SocialSessionService(IUnitOfWork uow) : ISocialSessionService
{
    public async Task<IEnumerable<SocialSessionListItemDto>> SearchAsync(int? sportId, int? facilityId, decimal? minSkill, decimal? maxSkill, DateOnly? date)
    {
        if (sportId is <= 0 || facilityId is <= 0 || minSkill is < 1 or > 5 || maxSkill is < 1 or > 5 || minSkill > maxSkill)
            throw new ValidationException(["Bộ lọc không hợp lệ."]);
        return (await uow.SocialSessions.FilterAsync(sportId, facilityId, minSkill, maxSkill, date)).Select(Map).ToList();
    }

    public async Task<IEnumerable<SocialSessionListItemDto>> ManageAsync(int userId)
    {
        var user = await GetManagerAsync(userId);
        int? facility = user.UserRole!.Role.RoleCode == "ADMIN" ? null : user.StaffProfile!.ManagedFacilityId;
        return (await uow.SocialSessions.FilterAsync(null, facility, null, null, null, false)).Select(Map).ToList();
    }

    public async Task<SocialSessionListItemDto> GetAsync(int id, int? userId)
    {
        var session = await LoadAsync(id);
        if (session.Status != "Published")
        {
            if (userId is null) throw new NotFoundException("Buổi Social", id);
            var user = await GetManagerAsync(userId.Value);
            EnsureFacility(user, session.FacilityId);
        }
        return Map(session);
    }

    public async Task<SocialSessionListItemDto> CreateAsync(CreateSocialSessionDto input, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var user = await GetManagerAsync(userId);
            EnsureFacility(user, input.FacilityId);
            await ValidateAsync(input, null);
            var session = new SocialSession { CreatedByStaffId = userId, Status = "Published" };
            Apply(session, input);
            foreach (var courtId in input.CourtIds)
                session.SessionCourts.Add(new SocialSessionCourt { CourtId = courtId });
            await uow.SocialSessions.AddAsync(session);
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            return Map(session);
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    public async Task<SocialSessionListItemDto> UpdateAsync(int id, CreateSocialSessionDto input, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var user = await GetManagerAsync(userId);
            var session = await LoadAsync(id);
            EnsureFacility(user, session.FacilityId);
            EnsureFacility(user, input.FacilityId);
            EnsureEditable(session);
            await ValidateAsync(input, id);
            Apply(session, input);
            foreach (var court in session.SessionCourts.Where(c => !input.CourtIds.Contains(c.CourtId)).ToList())
            {
                uow.SocialSessions.RemoveCourt(court);
                session.SessionCourts.Remove(court);
            }
            foreach (var courtId in input.CourtIds.Where(c => !session.SessionCourts.Any(x => x.CourtId == c)))
                session.SessionCourts.Add(new SocialSessionCourt { CourtId = courtId });
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
            return Map(session);
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    public async Task CancelAsync(int id, int userId)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var user = await GetManagerAsync(userId);
            var session = await LoadAsync(id);
            EnsureFacility(user, session.FacilityId);
            EnsureEditable(session);
            session.Status = "Cancelled";
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();
        }
        catch { await uow.RollbackTransactionAsync(); throw; }
    }

    private async Task<User> GetManagerAsync(int id)
    {
        var user = await uow.Users.GetWithProfileAsync(id);
        if (user is null || !user.IsActive || user.UserRole?.Role.RoleCode is not ("ADMIN" or "STAFF"))
            throw new ForbiddenException("Chỉ Admin hoặc Staff được quản lý buổi Social.");
        if (user.UserRole.Role.RoleCode == "STAFF" && user.StaffProfile?.ManagedFacilityId is null)
            throw new ForbiddenException("Staff chưa được phân công cơ sở.");
        return user;
    }

    private static void EnsureFacility(User user, int facilityId)
    {
        if (user.UserRole!.Role.RoleCode != "ADMIN" && user.StaffProfile?.ManagedFacilityId != facilityId)
            throw new ForbiddenException("Bạn không có quyền quản lý cơ sở này.");
    }

    private async Task<SocialSession> LoadAsync(int id) => await uow.SocialSessions.GetDetailAsync(id)
        ?? throw new NotFoundException("Buổi Social", id);

    private static DateTime VietnamNow() => DateTime.UtcNow.AddHours(7);

    private static void EnsureEditable(SocialSession session)
    {
        if (session.Status != "Published" || session.PlayDate.ToDateTime(session.StartTime) <= VietnamNow())
            throw new ConflictException("Chỉ được sửa/hủy buổi Published chưa bắt đầu.");
        // Ticket refunds belong to week 5; do not discard paid tickets.
        if (session.Participants.Any(p => p.Status != "Cancelled"))
            throw new ConflictException("Buổi đã có người tham gia; cần xử lý vé trước khi sửa/hủy.");
    }

    private async Task ValidateAsync(CreateSocialSessionDto input, int? excludeId)
    {
        var results = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(input, new(input), results, true))
            throw new ValidationException(results.Select(r => r.ErrorMessage ?? "Dữ liệu không hợp lệ."));
        if (input.StartTime >= input.EndTime || input.PlayDate.ToDateTime(input.StartTime) <= VietnamNow() || input.MinSkill > input.MaxSkill)
            throw new ValidationException(["Ngày giờ chơi hoặc khoảng trình độ không hợp lệ."]);
        if (input.CourtIds.Any(c => c <= 0) || input.CourtIds.Distinct().Count() != input.CourtIds.Count)
            throw new ValidationException(["Danh sách sân không hợp lệ hoặc trùng lặp."]);
        var facility = await uow.Facilities.GetByIdAsync(input.FacilityId);
        if (facility is null || !facility.IsActive) throw new NotFoundException("Cơ sở hoạt động", input.FacilityId);
        var sport = await uow.Facilities.GetSportEntityByIdAsync(input.SportId);
        if (sport is null || !sport.IsActive) throw new NotFoundException("Môn thể thao hoạt động", input.SportId);
        if (input.StartTime < facility.OpenTime || input.EndTime > facility.CloseTime)
            throw new ValidationException(["Giờ chơi phải nằm trong giờ mở cửa cơ sở."]);
        foreach (var courtId in input.CourtIds)
        {
            var court = await uow.Courts.GetByIdAsync(courtId);
            if (court is null || !court.IsActive || court.FacilityId != input.FacilityId || court.SportId != input.SportId)
                throw new ValidationException([$"Sân {courtId} không hợp lệ với cơ sở/môn đã chọn."]);
        }
        if (await uow.SocialSessions.HasCourtConflictAsync(input.CourtIds.ToArray(), input.PlayDate, input.StartTime, input.EndTime, excludeId))
            throw new ConflictException("Một hoặc nhiều sân đã được đặt, bảo trì hoặc có buổi Social trùng giờ.");
    }

    private static void Apply(SocialSession s, CreateSocialSessionDto d)
    {
        s.FacilityId = d.FacilityId; s.SportId = d.SportId; s.Title = d.Title.Trim();
        s.PlayDate = d.PlayDate; s.StartTime = d.StartTime; s.EndTime = d.EndTime;
        s.MaxParticipants = d.MaxParticipants; s.FeePerSlot = d.FeePerSlot;
        s.MinSkill = d.MinSkill; s.MaxSkill = d.MaxSkill; s.Description = d.Description;
    }

    private static SocialSessionListItemDto Map(SocialSession s) => new()
    {
        Id = s.Id, Title = s.Title, FacilityId = s.FacilityId, SportId = s.SportId,
        PlayDate = s.PlayDate, StartTime = s.StartTime, EndTime = s.EndTime,
        MaxParticipants = s.MaxParticipants, FeePerSlot = s.FeePerSlot,
        MinSkill = s.MinSkill, MaxSkill = s.MaxSkill, Status = s.Status,
        RegisteredCount = s.Participants.Count(p => p.Status == "Confirmed" || p.Status == "CheckedIn"),
        HeldCount = s.Participants.Count(p => SocialTicketPolicy.IsLiveHold(p, DateTime.UtcNow)),
        Description = s.Description, CourtIds = s.SessionCourts.Select(c => c.CourtId).ToList()
    };
}
