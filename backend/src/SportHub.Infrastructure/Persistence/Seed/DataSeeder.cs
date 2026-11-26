using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Entities.Notifications;

namespace SportHub.Infrastructure.Persistence.Seed;

public static class DataSeeder
{
    public const string AdminPhone = "0900000000";
    public const string AdminPassword = "Admin@123";
    public const string StaffPhone = "0900000002";
    public const string StaffPassword = "Staff@123";
    public const string PlayerPassword = "Test@1234";

    private static readonly (string Name, string Phone, int Reputation, decimal Skill, string Level, int Points, string Tier)[] PlayerSeeds =
    [
        ("Pham Minh Dung", "0922222201", 100, 3.50m, "Intermediate", 250, "Silver"),
        ("Hoang Thi Lan", "0922222202", 95, 2.10m, "Beginner", 50, "Bronze"),
        ("Vu Duc Khai", "0922222203", 100, 4.20m, "Advanced", 800, "Gold"),
        ("Ngo Thi Mai", "0922222204", 80, 2.50m, "Beginner", 30, "Bronze"),
        ("Dinh Van Nam", "0922222205", 100, 3.80m, "Intermediate", 410, "Silver"),
        ("Bui Thi Oanh", "0922222206", 60, 2.00m, "Beginner", 10, "Bronze"),
        ("Nguyen Gia Bao", "0930000001", 100, 3.10m, "Intermediate", 120, "Bronze"),
        ("Tran Ngoc Anh", "0930000002", 92, 2.80m, "Beginner", 85, "Bronze"),
        ("Le Quoc Huy", "0930000003", 100, 4.60m, "Advanced", 1250, "Gold"),
        ("Pham Thuy Linh", "0930000004", 98, 3.40m, "Intermediate", 340, "Silver"),
        ("Vo Minh Khang", "0930000005", 75, 2.20m, "Beginner", 40, "Bronze"),
        ("Bui Khanh Vy", "0930000006", 100, 3.90m, "Intermediate", 620, "Gold"),
        ("Dang Tuan Kiet", "0930000007", 88, 3.00m, "Intermediate", 160, "Bronze"),
        ("Hoang My Duyen", "0930000008", 100, 4.10m, "Advanced", 910, "Gold"),
        ("Do Thanh Phuc", "0930000009", 55, 1.80m, "Beginner", 0, "Bronze"),
        ("Nguyen Bao Tram", "0930000010", 97, 3.30m, "Intermediate", 275, "Silver"),
        ("Pham Duc Thinh", "0930000011", 100, 4.80m, "Advanced", 1640, "Diamond"),
        ("Truong Nhu Quynh", "0930000012", 82, 2.60m, "Beginner", 65, "Bronze"),
        ("Mai Hoang Long", "0930000013", 100, 3.70m, "Intermediate", 530, "Silver"),
        ("Ly Tuong Vi", "0930000014", 93, 3.20m, "Intermediate", 215, "Silver"),
        ("Cao Anh Tuan", "0930000015", 100, 4.30m, "Advanced", 1080, "Gold"),
        ("Phan Ngoc Han", "0930000016", 69, 2.00m, "Beginner", 20, "Bronze"),
        ("Huynh Nhat Minh", "0930000017", 99, 3.60m, "Intermediate", 445, "Silver"),
        ("Ta Phuong Thao", "0930000018", 100, 4.00m, "Advanced", 770, "Gold"),
        ("Ngo Duc Anh", "0930000019", 90, 2.90m, "Beginner", 105, "Bronze"),
        ("Luong Thu Ha", "0930000020", 100, 3.50m, "Intermediate", 390, "Silver")
    ];

    private static bool _schemaPatched;

    public static async Task EnsureSchemaUpToDateAsync(SportHubDbContext db)
    {
        if (_schemaPatched) return;

        try
        {
            await db.Database.MigrateAsync();
        }
        catch
        {
            // Nếu DB đã tạo bảng trước đó không qua lịch sử migration chuẩn thì dùng DDL bổ sung bên dưới
        }

        const string patchSql = """
            IF COL_LENGTH('PaymentTransactions', 'PaymentUrl') IS NULL
                ALTER TABLE [PaymentTransactions] ADD [PaymentUrl] nvarchar(2048) NULL;

            IF COL_LENGTH('PaymentTransactions', 'ProviderTransactionDate') IS NULL
                ALTER TABLE [PaymentTransactions] ADD [ProviderTransactionDate] datetime2 NULL;

            IF COL_LENGTH('PaymentTransactions', 'ProviderTransactionId') IS NULL
                ALTER TABLE [PaymentTransactions] ADD [ProviderTransactionId] nvarchar(100) NULL;

            IF COL_LENGTH('PaymentTransactions', 'RelatedTransactionId') IS NULL
                ALTER TABLE [PaymentTransactions] ADD [RelatedTransactionId] int NULL;

            IF COL_LENGTH('PaymentTransactions', 'TransactionType') IS NULL
                ALTER TABLE [PaymentTransactions] ADD [TransactionType] nvarchar(10) NOT NULL CONSTRAINT [DF_PaymentTransactions_TransactionType] DEFAULT N'Payment';

            IF COL_LENGTH('BookingCancellations', 'RefundFailureReason') IS NULL
                ALTER TABLE [BookingCancellations] ADD [RefundFailureReason] nvarchar(500) NULL;

            IF COL_LENGTH('BookingCancellations', 'RefundStatus') IS NULL
                ALTER TABLE [BookingCancellations] ADD [RefundStatus] nvarchar(20) NOT NULL CONSTRAINT [DF_BookingCancellations_RefundStatus] DEFAULT N'NotRequired';
            """;

        await db.Database.ExecuteSqlRawAsync(patchSql);
        _schemaPatched = true;
    }

    public static async Task SeedDevelopmentDataAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        await EnsureSchemaUpToDateAsync(db);

        var roleSeeds = new[]
        {
            ("ADMIN", "Quản trị viên", "Toàn quyền hệ thống"),
            ("STAFF", "Nhân viên", "Vận hành quầy tại chi nhánh được phân công"),
            ("PLAYER", "Người chơi", "Khách hàng có tài khoản"),
        };
        foreach (var (code, name, description) in roleSeeds)
        {
            if (!await db.Roles.AnyAsync(role => role.RoleCode == code))
                db.Roles.Add(new Role { RoleCode = code, RoleName = name, Description = description });
        }
        await db.SaveChangesAsync();

        var roles = await db.Roles.ToDictionaryAsync(role => role.RoleCode);
        var sportSeeds = new[]
        {
            ("BADMINTON", "Cầu lông"),
            ("PICKLEBALL", "Pickleball"),
            ("FOOTBALL5", "Bóng đá 5 người"),
        };
        foreach (var (code, name) in sportSeeds)
        {
            if (!await db.Sports.AnyAsync(sport => sport.SportCode == code))
                db.Sports.Add(new Sport { SportCode = code, SportName = name });
        }
        await db.SaveChangesAsync();

        if (!await db.TimeSlots.AnyAsync())
        {
            var peakStart = new TimeOnly(17, 0);
            var peakEnd = new TimeOnly(21, 0);
            for (int h = 6; h < 23; h++)
            {
                var slotStart = new TimeOnly(h, 0);
                var slotEnd = new TimeOnly(h + 1, 0);
                db.TimeSlots.Add(new TimeSlot
                {
                    SlotIndex = h - 6 + 1,
                    StartTime = slotStart,
                    EndTime = slotEnd,
                    IsDefaultPeak = slotStart >= peakStart && slotEnd <= peakEnd
                });
            }
            await db.SaveChangesAsync();
        }

        if (!await db.PaymentMethods.AnyAsync())
        {
            db.PaymentMethods.AddRange(
                new PaymentMethod { MethodCode = "CASH", MethodName = "Tiền mặt tại quầy", IsActive = true },
                new PaymentMethod { MethodCode = "QR_TRANSFER", MethodName = "Chuyển khoản VietQR", IsActive = true },
                new PaymentMethod { MethodCode = "VNPAY", MethodName = "Cổng thanh toán VNPay", IsActive = true }
            );
            await db.SaveChangesAsync();
        }

        var firstFacilityId = await db.Facilities
            .OrderBy(facility => facility.Id)
            .Select(facility => (int?)facility.Id)
            .FirstOrDefaultAsync();

        await EnsureDemoUserAsync(
            db,
            roles["ADMIN"],
            AdminPhone,
            AdminPassword,
            "Quản trị viên SportHub",
            hasher);
        await EnsureDemoStaffAsync(db, roles["STAFF"], firstFacilityId, hasher);
        await EnsureDemoPlayersAsync(db, roles["PLAYER"], hasher);

        var usersWithoutRole = await db.Users.Where(user => user.UserRole == null).ToListAsync();
        foreach (var user in usersWithoutRole)
            user.UserRole = new UserRole { Role = roles["PLAYER"] };

        await db.SaveChangesAsync();
    }

    private static async Task EnsureDemoUserAsync(
        SportHubDbContext db,
        Role role,
        string phone,
        string password,
        string fullName,
        IPasswordHasher hasher)
    {
        var user = await db.Users
            .Include(item => item.UserRole)
            .FirstOrDefaultAsync(item => item.PhoneNumber == phone);
        var passwordHash = hasher.Hash(password);

        if (user is null)
        {
            db.Users.Add(new User
            {
                FullName = fullName,
                PhoneNumber = phone,
                PasswordHash = passwordHash,
                IsActive = true,
                UserRole = new UserRole { Role = role }
            });
            return;
        }

        user.PasswordHash = passwordHash;
        user.IsActive = true;
        if (user.UserRole is null)
            user.UserRole = new UserRole { Role = role };
    }

    private static async Task EnsureDemoStaffAsync(
        SportHubDbContext db,
        Role staffRole,
        int? facilityId,
        IPasswordHasher hasher)
    {
        var staff = await db.Users
            .Include(user => user.StaffProfile)
            .Include(user => user.UserRole)
            .FirstOrDefaultAsync(user => user.PhoneNumber == StaffPhone);

        if (staff is null)
        {
            db.Users.Add(new User
            {
                FullName = "Nhân viên lễ tân SportHub",
                PhoneNumber = StaffPhone,
                PasswordHash = hasher.Hash(StaffPassword),
                IsActive = true,
                UserRole = new UserRole { Role = staffRole },
                StaffProfile = new StaffProfile { ManagedFacilityId = facilityId, Position = "Lễ tân" }
            });
            return;
        }

        staff.PasswordHash = hasher.Hash(StaffPassword);
        staff.IsActive = true;
        staff.UserRole ??= new UserRole { Role = staffRole };
        staff.StaffProfile ??= new StaffProfile { ManagedFacilityId = facilityId, Position = "Lễ tân" };
        if (staff.StaffProfile.ManagedFacilityId is null && facilityId is not null)
            staff.StaffProfile.ManagedFacilityId = facilityId;
    }

    private static async Task EnsureDemoPlayersAsync(
        SportHubDbContext db,
        Role playerRole,
        IPasswordHasher hasher)
    {
        var playerPhones = PlayerSeeds.Select(seed => seed.Phone).ToArray();
        var playersByPhone = await db.Users
            .Include(user => user.UserRole)
            .Include(user => user.PlayerProfile)
            .Where(user => playerPhones.Contains(user.PhoneNumber))
            .ToDictionaryAsync(user => user.PhoneNumber);
        var passwordHash = hasher.Hash(PlayerPassword);

        foreach (var seed in PlayerSeeds)
        {
            if (!playersByPhone.TryGetValue(seed.Phone, out var player))
            {
                db.Users.Add(new User
                {
                    FullName = seed.Name,
                    PhoneNumber = seed.Phone,
                    PasswordHash = passwordHash,
                    IsActive = true,
                    UserRole = new UserRole { Role = playerRole },
                    PlayerProfile = CreatePlayerProfile(seed)
                });
                continue;
            }

            player.PasswordHash = passwordHash;
            player.IsActive = true;
            player.UserRole ??= new UserRole { Role = playerRole };
            player.PlayerProfile ??= CreatePlayerProfile(seed);
        }

        await db.SaveChangesAsync();

        // 6. Tạo mẫu thông báo
        var notificationTemplates = new[]
        {
    new NotificationTemplate
    {
        TemplateCode = "WELCOME",
        TitlePattern = "Chào mừng đến với SportHub!",
        BodyPattern = "Xin chào {FullName}, chúc bạn có những trải nghiệm tuyệt vời tại SportHub."
    },
    new NotificationTemplate
    {
        TemplateCode = "BOOKING_CONFIRMED",
        TitlePattern = "Đặt sân thành công",
        BodyPattern = "Xin chào {FullName}, đơn đặt sân #{BookingId} của bạn đã được xác nhận."
    },
    new NotificationTemplate
    {
        TemplateCode = "BOOKING_CANCELLED",
        TitlePattern = "Đơn đặt sân đã bị hủy",
        BodyPattern = "Xin chào {FullName}, đơn đặt sân #{BookingId} của bạn đã bị hủy."
    },
    new NotificationTemplate
    {
        TemplateCode = "PAYMENT_SUCCESS",
        TitlePattern = "Thanh toán thành công",
        BodyPattern = "Xin chào {FullName}, thanh toán #{PaymentId} của bạn đã hoàn tất."
    }
};

        foreach (var template in notificationTemplates)
        {
            if (!await db.NotificationTemplates.AnyAsync(
                x => x.TemplateCode == template.TemplateCode))
            {
                db.NotificationTemplates.Add(template);
            }
        }

        await db.SaveChangesAsync();
    }

    private static PlayerProfile CreatePlayerProfile(
        (string Name, string Phone, int Reputation, decimal Skill, string Level, int Points, string Tier) seed)
        => new()
        {
            ReputationScore = seed.Reputation,
            NumericSkillRating = seed.Skill,
            SkillLevel = seed.Level,
            LoyaltyPoints = seed.Points,
            CurrentTier = seed.Tier
        };
}
