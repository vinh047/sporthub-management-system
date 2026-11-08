
namespace SportHub.Application.DTOs.Staff;

// --- Request ---

// Admin tạo tài khoản nhân viên
public record CreateStaffProfileRequest(
    string FullName,
    string PhoneNumber,
    string Password,
    string Position,
    int? ManagedFacilityId
);

// Admin cập nhật hồ sơ nhân viên
public record UpdateStaffProfileRequest(
    string FullName,
    string PhoneNumber,
    string Position,
    int? ManagedFacilityId,
    bool IsActive
);

// --- Response ---

// Thông tin một nhân viên
public record StaffProfileResponse(
    int UserId,
    string FullName,
    string PhoneNumber,
    string Position,
    int? ManagedFacilityId,
    string? FacilityName,
    bool IsActive
);
