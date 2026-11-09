using System.Data;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class TournamentService(IUnitOfWork uow) : ITournamentService
{
    private static readonly HashSet<string> ValidTypes = ["SingleElimination", "RoundRobin"];
    private static readonly HashSet<string> ValidStatuses = ["Draft", "OpenReg", "DrawCompleted", "InProgress", "Finished"];

    public async Task<List<TournamentDto>> GetTournamentsAsync(int? facilityId, int? sportId, string? status)
    {
        var tournaments = await uow.Tournaments.GetFilteredAsync(facilityId, sportId, status);
        return tournaments.Select(ToDto).ToList();
    }

    public async Task<TournamentDetailDto> GetTournamentByIdAsync(int id)
    {
        if (id <= 0)
            throw new ValidationException(["Mã giải đấu không hợp lệ."]);

        var tournament = await uow.Tournaments.GetByIdWithDetailsAsync(id, asNoTracking: true)
            ?? throw new NotFoundException("Giải đấu", id);

        return ToDetailDto(tournament);
    }

    public async Task<TournamentDto> CreateTournamentAsync(CreateTournamentRequest request, int staffUserId, bool isAdmin)
    {
        var errors = new List<string>();
        if (request.FacilityId <= 0)
            errors.Add("Vui lòng chọn cơ sở tổ chức hợp lệ.");
        if (request.SportId <= 0)
            errors.Add("Vui lòng chọn bộ môn thi đấu hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.Name))
            errors.Add("Tên giải đấu không được để trống.");
        else if (request.Name.Trim().Length is < 3 or > 150)
            errors.Add("Tên giải đấu phải từ 3 đến 150 ký tự.");

        if (!ValidTypes.Contains(request.TournamentType))
            errors.Add("Thể thức giải đấu không hợp lệ (SingleElimination hoặc RoundRobin).");
        if (!ValidStatuses.Contains(request.Status))
            errors.Add("Trạng thái giải đấu không hợp lệ.");
        if (request.MaxTeams is < 2 or > 64)
            errors.Add("Số lượng đội tối đa phải từ 2 đến 64 đội.");
        else if (request.TournamentType == "SingleElimination" && request.MaxTeams % 2 != 0)
            errors.Add("Thể thức Loại trực tiếp (SingleElimination) yêu cầu số lượng đội tối đa là số chẵn.");

        if (request.EntryFee is < 0 or > 100_000_000m)
            errors.Add("Lệ phí tham gia phải từ 0đ đến 100.000.000đ.");
        if (!string.IsNullOrWhiteSpace(request.PrizeDescription) && request.PrizeDescription.Trim().Length > 2000)
            errors.Add("Điều lệ và cơ cấu giải thưởng không được vượt quá 2000 ký tự.");
        if (request.EndDate < request.StartDate)
            errors.Add("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
        if (DateOnly.FromDateTime(request.RegistrationDeadline) > request.StartDate)
            errors.Add("Hạn chót đăng ký không được vượt quá ngày khai mạc giải đấu.");

        if (errors.Count > 0)
            throw new ValidationException(errors);

        var facility = await uow.Facilities.GetByIdAsync(request.FacilityId)
            ?? throw new NotFoundException("Cơ sở", request.FacilityId);
        if (!facility.IsActive)
            throw new ValidationException(["Cơ sở đang ngừng hoạt động."]);

        if (!isAdmin)
        {
            var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            if (staffFacilityId != facility.Id)
                throw new ForbiddenException("Bạn chỉ được tạo giải đấu tại cơ sở mình quản lý.");
        }

        var sport = await uow.Facilities.GetSportByIdAsync(request.SportId)
            ?? throw new NotFoundException("Môn thể thao", request.SportId);
        if (!sport.IsActive)
            throw new ValidationException(["Môn thể thao đang ngừng hoạt động."]);

        var tournament = new Tournament
        {
            FacilityId = facility.Id,
            SportId = sport.Id,
            Name = request.Name.Trim(),
            TournamentType = request.TournamentType,
            RegistrationDeadline = request.RegistrationDeadline,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            MaxTeams = request.MaxTeams,
            EntryFee = request.EntryFee,
            PrizeDescription = string.IsNullOrWhiteSpace(request.PrizeDescription) ? null : request.PrizeDescription.Trim(),
            Status = request.Status,
            CreatedByStaffId = staffUserId,
            CreatedAt = DateTime.UtcNow,
            Facility = facility,
            Sport = sport
        };

        await uow.Tournaments.AddAsync(tournament);
        await uow.SaveChangesAsync();

        return ToDto(tournament);
    }

    public async Task<TournamentDto> UpdateTournamentStatusAsync(int id, string status, int staffUserId, bool isAdmin)
    {
        if (id <= 0)
            throw new ValidationException(["Mã giải đấu không hợp lệ."]);
        if (string.IsNullOrWhiteSpace(status) || !ValidStatuses.Contains(status.Trim()))
            throw new ValidationException(["Trạng thái giải đấu không hợp lệ."]);

        var cleanStatus = status.Trim();
        var tournament = await uow.Tournaments.GetByIdWithDetailsAsync(id)
            ?? throw new NotFoundException("Giải đấu", id);

        if (!isAdmin)
        {
            var staffFacilityId = await uow.CheckIns.GetStaffFacilityIdAsync(staffUserId);
            if (staffFacilityId != tournament.FacilityId)
                throw new ForbiddenException("Bạn không có quyền quản lý giải đấu của cơ sở khác.");
        }

        tournament.Status = cleanStatus;
        await uow.SaveChangesAsync();

        return ToDto(tournament);
    }

    public async Task<TournamentTeamDto> RegisterTeamAsync(int tournamentId, RegisterTournamentTeamRequest request, int currentUserId)
    {
        var validationErrors = new List<string>();
        if (tournamentId <= 0)
            validationErrors.Add("Mã giải đấu không hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.TeamName))
            validationErrors.Add("Tên đội không được để trống.");
        else if (request.TeamName.Trim().Length is < 2 or > 80)
            validationErrors.Add("Tên đội thi đấu phải từ 2 đến 80 ký tự.");

        if (request.MemberPhones is not null)
        {
            var nonEmptyPhones = request.MemberPhones
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => new string(p.Trim().Where(char.IsDigit).ToArray()))
                .ToList();

            if (nonEmptyPhones.Count > 10)
                validationErrors.Add("Một đội không được đăng ký quá 10 vận động viên.");
            if (nonEmptyPhones.Distinct(StringComparer.Ordinal).Count() != nonEmptyPhones.Count)
                validationErrors.Add("Danh sách vận động viên trong đội có số điện thoại bị trùng lặp.");

            foreach (var rawPhone in request.MemberPhones.Where(p => !string.IsNullOrWhiteSpace(p)))
            {
                var digits = new string(rawPhone.Trim().Where(char.IsDigit).ToArray());
                if (digits.Length is < 9 or > 15)
                    validationErrors.Add($"Số điện thoại vận động viên '{rawPhone.Trim()}' không hợp lệ (cần 9–15 chữ số).");
            }
        }

        if (request.MemberNames is not null)
        {
            foreach (var rawName in request.MemberNames.Where(n => !string.IsNullOrWhiteSpace(n)))
            {
                var trimmedName = rawName.Trim();
                if (trimmedName.Length is < 2 or > 80)
                    validationErrors.Add($"Họ tên vận động viên '{trimmedName}' phải từ 2 đến 80 ký tự.");
            }
        }

        if (validationErrors.Count > 0)
            throw new ValidationException(validationErrors);

        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var tournament = await uow.Tournaments.GetByIdWithDetailsAsync(tournamentId)
                ?? throw new NotFoundException("Giải đấu", tournamentId);

            if (tournament.Status != "OpenReg")
                throw new ValidationException(["Giải đấu hiện không mở cổng đăng ký."]);

            if (DateTime.UtcNow > tournament.RegistrationDeadline)
                throw new ValidationException(["Đã quá hạn đăng ký tham gia giải đấu."]);

            var activeTeams = tournament.Teams.Where(t => t.Status != "Disqualified").ToList();
            if (activeTeams.Count >= tournament.MaxTeams)
                throw new ConflictException("Giải đấu đã đủ số lượng đội tối đa.");

            var trimmedTeamName = request.TeamName.Trim();
            if (activeTeams.Any(t => string.Equals(t.TeamName, trimmedTeamName, StringComparison.OrdinalIgnoreCase)))
                throw new ConflictException($"Tên đội '{trimmedTeamName}' đã tồn tại trong giải đấu này.");

            var captain = await uow.Users.GetWithProfileAsync(currentUserId)
                ?? throw new NotFoundException("Người dùng", currentUserId);

            if (captain.PlayerProfile is not null && captain.PlayerProfile.ReputationScore < 60)
                throw new ValidationException(["Điểm uy tín của đội trưởng phải từ 60 trở lên để đăng ký giải đấu."]);

            var existingAthleteUserIds = activeTeams
                .SelectMany(t => t.Athletes)
                .Select(a => a.UserId)
                .ToHashSet();

            // Danh sách vận động viên trong đội (Đội trưởng + các thành viên đi kèm)
            var athleteUsers = new List<(User User, bool IsCaptain)>();
            var addedUserIds = new HashSet<int>();

            if (!existingAthleteUserIds.Contains(captain.Id))
            {
                athleteUsers.Add((captain, true));
                addedUserIds.Add(captain.Id);
            }

            if (request.MemberPhones is not null)
            {
                var playerRole = await uow.Users.GetRoleByCodeAsync("PLAYER");
                for (var idx = 0; idx < request.MemberPhones.Count; idx++)
                {
                    var rawPhone = request.MemberPhones[idx];
                    if (string.IsNullOrWhiteSpace(rawPhone))
                        continue;

                    var phone = new string(rawPhone.Trim().Where(char.IsDigit).ToArray());
                    if (phone.Length is < 9 or > 15)
                        throw new ValidationException([$"Số điện thoại vận động viên '{rawPhone.Trim()}' không hợp lệ (cần 9–15 chữ số)."]);

                    var customName = request.MemberNames is not null && idx < request.MemberNames.Count
                        ? request.MemberNames[idx]?.Trim()
                        : null;

                    var member = await uow.Users.GetForLoginAsync(phone);
                    if (member is null)
                    {
                        member = new User
                        {
                            FullName = !string.IsNullOrWhiteSpace(customName) ? customName : $"VĐV {phone}",
                            PhoneNumber = phone,
                            PasswordHash = "$2a$12$K5G0jRCM6bkKDn5OVeT3xuiZjRoUEjDaqlJd3RJjdJ0OBWiMfyU0S",
                            IsActive = true,
                            PlayerProfile = new Domain.Entities.Player.PlayerProfile
                            {
                                ReputationScore = 100,
                                NumericSkillRating = 2.00m,
                                SkillLevel = "Beginner",
                                CurrentTier = "Bronze"
                            },
                            UserRole = playerRole is not null ? new UserRole { RoleId = playerRole.Id } : null
                        };
                        await uow.Users.AddAsync(member);
                        await uow.SaveChangesAsync();
                    }
                    else if (!string.IsNullOrWhiteSpace(customName) && member.FullName.StartsWith("VĐV ", StringComparison.OrdinalIgnoreCase))
                    {
                        member.FullName = customName;
                    }

                    if (existingAthleteUserIds.Contains(member.Id))
                        throw new ConflictException($"Vận động viên '{member.FullName}' ({member.PhoneNumber}) đã đăng ký trong một đội khác của giải đấu này.");

                    if (addedUserIds.Add(member.Id))
                        athleteUsers.Add((member, athleteUsers.Count == 0));
                }
            }

            if (request.MemberUserIds is not null)
            {
                foreach (var memberId in request.MemberUserIds.Distinct())
                {
                    if (!addedUserIds.Add(memberId)) continue;
                    var member = await uow.Users.GetWithProfileAsync(memberId)
                        ?? throw new NotFoundException("Vận động viên", memberId);

                    if (existingAthleteUserIds.Contains(member.Id))
                        throw new ConflictException($"Vận động viên '{member.FullName}' ({member.PhoneNumber}) đã đăng ký trong một đội khác của giải đấu này.");

                    athleteUsers.Add((member, athleteUsers.Count == 0));
                }
            }

            if (athleteUsers.Count == 0)
            {
                throw new ConflictException($"Tài khoản '{captain.FullName}' đã đăng ký trong một đội khác của giải đấu này. Vui lòng nhập thêm SĐT vận động viên mới.");
            }

            var team = new TournamentTeam
            {
                TournamentId = tournament.Id,
                TeamName = trimmedTeamName,
                SeedNumber = activeTeams.Count + 1,
                Status = "Approved",
                RegistrationDate = DateTime.UtcNow
            };

            foreach (var (athleteUser, isCaptain) in athleteUsers)
            {
                team.Athletes.Add(new TournamentAthlete
                {
                    UserId = athleteUser.Id,
                    IsCaptain = isCaptain,
                    User = athleteUser
                });
            }

            await uow.Tournaments.AddTeamAsync(team);
            await uow.SaveChangesAsync();
            await uow.CommitTransactionAsync();

            return ToTeamDto(team);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    private static TournamentDto ToDto(Tournament t) => new(
        t.Id,
        t.FacilityId,
        t.Facility?.Name ?? string.Empty,
        t.SportId,
        t.Sport?.SportName ?? string.Empty,
        t.Name,
        t.TournamentType,
        t.RegistrationDeadline,
        t.StartDate,
        t.EndDate,
        t.MaxTeams,
        t.Teams.Count(team => team.Status != "Disqualified"),
        t.EntryFee,
        t.PrizeDescription,
        t.Status,
        t.CreatedAt
    );

    private static TournamentDetailDto ToDetailDto(Tournament t) => new(
        t.Id,
        t.FacilityId,
        t.Facility?.Name ?? string.Empty,
        t.Facility?.Address ?? string.Empty,
        t.SportId,
        t.Sport?.SportName ?? string.Empty,
        t.Name,
        t.TournamentType,
        t.RegistrationDeadline,
        t.StartDate,
        t.EndDate,
        t.MaxTeams,
        t.Teams.Count(team => team.Status != "Disqualified"),
        t.EntryFee,
        t.PrizeDescription,
        t.Status,
        t.CreatedAt,
        t.Teams
            .OrderBy(team => team.SeedNumber ?? int.MaxValue)
            .ThenBy(team => team.RegistrationDate)
            .Select(ToTeamDto)
            .ToList(),
        t.Matches
            .OrderBy(m => m.RoundNumber)
            .ThenBy(m => m.MatchOrder)
            .Select(m => new TournamentMatchDto(
                m.Id,
                m.RoundNumber,
                m.MatchOrder,
                m.CourtId,
                m.Court?.CourtName,
                m.ScheduledStartTime,
                m.Team1Id,
                m.Team1?.TeamName,
                m.Team2Id,
                m.Team2?.TeamName,
                m.WinnerTeamId,
                m.ScoreSummary,
                m.Status))
            .ToList()
    );

    private static TournamentTeamDto ToTeamDto(TournamentTeam team) => new(
        team.Id,
        team.TournamentId,
        team.TeamName,
        team.SeedNumber,
        team.Status,
        team.RegistrationDate,
        team.Athletes
            .OrderByDescending(a => a.IsCaptain)
            .ThenBy(a => a.Id)
            .Select(a => new TournamentAthleteDto(
                a.Id,
                a.UserId,
                a.User?.FullName ?? string.Empty,
                a.User?.PhoneNumber ?? string.Empty,
                a.IsCaptain,
                a.User?.PlayerProfile?.NumericSkillRating,
                a.User?.PlayerProfile?.SkillLevel))
            .ToList()
    );
}
