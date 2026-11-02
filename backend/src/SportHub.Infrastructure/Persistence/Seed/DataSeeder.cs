using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Player;

namespace SportHub.Infrastructure.Persistence.Seed;

/// <summary>
/// Tạo dữ liệu nền cho môi trường Development: vai trò, tài khoản Admin và Staff mẫu.
/// Chạy nhiều lần không bị trùng.
/// </summary>
public static class DataSeeder
{
    public const string AdminPhone = "0900000000";
    public const string AdminPassword = "Admin@123";
    public const string StaffPhone = "0900000001";
    public const string StaffPassword = "Staff@123";

    public static async Task SeedDevelopmentDataAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        // 1. Vai trò
        var roleSeeds = new[]
        {
            ("ADMIN", "Quản trị viên", "Toàn quyền hệ thống"),
            ("STAFF", "Nhân viên", "Vận hành quầy tại chi nhánh được phân công"),
            ("PLAYER", "Người chơi", "Khách hàng có tài khoản"),
        };
        foreach (var (code, name, description) in roleSeeds)
        {
            if (!await db.Roles.AnyAsync(r => r.RoleCode == code))
                db.Roles.Add(new Role { RoleCode = code, RoleName = name, Description = description });
        }
        await db.SaveChangesAsync();

        var roles = await db.Roles.ToDictionaryAsync(r => r.RoleCode);
        var firstFacilityId = await db.Facilities.OrderBy(f => f.Id).Select(f => (int?)f.Id).FirstOrDefaultAsync();

        // 2. Tài khoản Admin mẫu
        if (!await db.Users.AnyAsync(u => u.PhoneNumber == AdminPhone))
        {
            db.Users.Add(new User
            {
                FullName = "Quản trị viên",
                PhoneNumber = AdminPhone,
                PasswordHash = hasher.Hash(AdminPassword),
                UserRole = new UserRole { Role = roles["ADMIN"] }
            });
        }

        // 3. Tài khoản Staff mẫu, gắn vào cơ sở đầu tiên (nếu đã có cơ sở)
        var staff = await db.Users.Include(u => u.StaffProfile).FirstOrDefaultAsync(u => u.PhoneNumber == StaffPhone);
        if (staff is null)
        {
            db.Users.Add(new User
            {
                FullName = "Nhân viên lễ tân",
                PhoneNumber = StaffPhone,
                PasswordHash = hasher.Hash(StaffPassword),
                UserRole = new UserRole { Role = roles["STAFF"] },
                StaffProfile = new StaffProfile { ManagedFacilityId = firstFacilityId, Position = "Lễ tân" }
            });
        }
        else if (staff.StaffProfile is { ManagedFacilityId: null } && firstFacilityId is not null)
        {
            staff.StaffProfile.ManagedFacilityId = firstFacilityId;
        }

        // 4. Tài khoản tạo trước đây chưa có vai trò hoặc hồ sơ thì bổ sung thành người chơi
        var usersWithoutRole = await db.Users.Where(u => u.UserRole == null).ToListAsync();
        foreach (var user in usersWithoutRole)
            user.UserRole = new UserRole { Role = roles["PLAYER"] };
        await db.SaveChangesAsync();   // lưu trước để câu truy vấn dưới thấy vai trò vừa gán

        var playersWithoutProfile = await db.Users
            .Where(u => u.UserRole != null && u.UserRole.Role.RoleCode == "PLAYER" && u.PlayerProfile == null)
            .ToListAsync();
        foreach (var user in playersWithoutProfile)
            user.PlayerProfile = new PlayerProfile();

        await db.SaveChangesAsync();
    }
}
