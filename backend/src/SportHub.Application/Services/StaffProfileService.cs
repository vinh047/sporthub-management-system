using SportHub.Application.DTOs.Staff;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class StaffProfileService(
    IUnitOfWork uow,
    IPasswordHasher passwordHasher) : IStaffProfileService
{
    private const string StaffRole = "STAFF";

    // 1. Lấy danh sách nhân viên
    public async Task<IEnumerable<StaffProfileResponse>> GetAllAsync()
    {
        var profiles = await uow.StaffProfiles.GetAllDetailsAsync();

        return profiles.Select(MapToResponse);
    }

    // 2. Lấy chi tiết nhân viên
    public async Task<StaffProfileResponse> GetByUserIdAsync(int userId)
    {
        var profile = await uow.StaffProfiles.GetDetailAsync(userId)
            ?? throw new NotFoundException("Hồ sơ nhân viên", userId);

        return MapToResponse(profile);
    }

    // 3. Tạo nhân viên
    public async Task<StaffProfileResponse> CreateAsync(
        CreateStaffProfileRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var phone = request.PhoneNumber?.Trim() ?? "";
        var password = request.Password ?? "";
        var position = request.Position?.Trim() ?? "";

        ValidateStaffData(fullName, phone, position);

        if (password.Length < 6)
            throw new ValidationException(
                ["Mật khẩu phải có ít nhất 6 ký tự."]);

        // Kiểm tra số điện thoại trùng
        var existingUser = await uow.Users.GetByPhoneNumberAsync(phone);

        if (existingUser != null)
            throw new ConflictException(
                "Số điện thoại đã được đăng ký.");

        // Lấy Role STAFF
        var staffRole = await uow.Users.GetRoleByCodeAsync(StaffRole)
            ?? throw new InvalidOperationException(
                "Chưa có Role STAFF trong database.");

        // Kiểm tra cơ sở
        await ValidateFacilityAsync(request.ManagedFacilityId);

        // Tạo User và StaffProfile cùng lúc
        var user = new User
        {
            FullName = fullName,
            PhoneNumber = phone,
            PasswordHash = passwordHasher.Hash(password),
            IsActive = true,

            UserRole = new UserRole
            {
                Role = staffRole
            },

            StaffProfile = new StaffProfile
            {
                Position = position,
                ManagedFacilityId = request.ManagedFacilityId
            }
        };

        await uow.Users.AddAsync(user);
        await uow.SaveChangesAsync();

        var createdProfile =
            await uow.StaffProfiles.GetDetailAsync(user.Id);

        return MapToResponse(createdProfile!);
    }

    // 4. Cập nhật nhân viên
    public async Task<StaffProfileResponse> UpdateAsync(
        int userId,
        UpdateStaffProfileRequest request)
    {
        var profile = await uow.StaffProfiles.GetDetailAsync(userId)
            ?? throw new NotFoundException("Hồ sơ nhân viên", userId);

        var fullName = request.FullName?.Trim() ?? "";
        var phone = request.PhoneNumber?.Trim() ?? "";
        var position = request.Position?.Trim() ?? "";

        ValidateStaffData(fullName, phone, position);

        // Kiểm tra số điện thoại có thuộc tài khoản khác không
        var existingUser = await uow.Users.GetByPhoneNumberAsync(phone);

        if (existingUser != null && existingUser.Id != userId)
            throw new ConflictException(
                "Số điện thoại đã được tài khoản khác sử dụng.");

        await ValidateFacilityAsync(request.ManagedFacilityId);

        profile.User.FullName = fullName;
        profile.User.PhoneNumber = phone;
        profile.User.IsActive = request.IsActive;

        profile.Position = position;
        profile.ManagedFacilityId = request.ManagedFacilityId;

        await uow.SaveChangesAsync();

        var updatedProfile =
            await uow.StaffProfiles.GetDetailAsync(userId);

        return MapToResponse(updatedProfile!);
    }

    // 5. Xóa nhân viên (xóa mềm)
    public async Task DeleteAsync(int userId)
    {
        var profile = await uow.StaffProfiles.GetDetailAsync(userId)
            ?? throw new NotFoundException("Hồ sơ nhân viên", userId);

        // Không xóa vật lý để giữ lịch sử hoạt động
        profile.User.IsActive = false;

        await uow.SaveChangesAsync();
    }

    // Kiểm tra dữ liệu đầu vào
    private static void ValidateStaffData(
        string fullName,
        string phone,
        string position)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(fullName))
            errors.Add("Vui lòng nhập họ tên.");

        if (fullName.Length > 100)
            errors.Add("Họ tên không được vượt quá 100 ký tự.");

        if (phone.Length < 9 || phone.Length > 15 ||
            !phone.All(char.IsDigit))
            errors.Add("Số điện thoại không hợp lệ.");

        if (string.IsNullOrWhiteSpace(position))
            errors.Add("Vui lòng nhập chức vụ.");

        if (position.Length > 100)
            errors.Add("Chức vụ không được vượt quá 100 ký tự.");

        if (errors.Count > 0)
            throw new ValidationException(errors);
    }

    // Kiểm tra cơ sở có tồn tại
    private async Task ValidateFacilityAsync(int? facilityId)
    {
        if (facilityId.HasValue)
        {
            var facility = await uow.Facilities
                .GetByIdAsync(facilityId.Value);

            if (facility == null)
                throw new NotFoundException(
                    "Cơ sở", facilityId.Value);
        }
    }

    // Chuyển Entity thành Response
    private static StaffProfileResponse MapToResponse(
        StaffProfile profile)
    {
        return new StaffProfileResponse(
            profile.UserId,
            profile.User.FullName,
            profile.User.PhoneNumber,
            profile.Position,
            profile.ManagedFacilityId,
            profile.ManagedFacility?.Name,
            profile.User.IsActive
        );
    }
}
