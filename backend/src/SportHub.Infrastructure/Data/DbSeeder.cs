using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Loyalty;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.System;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Enums;
using SportHub.Infrastructure.Persistence;

namespace SportHub.Infrastructure.Data;

public static class DbSeeder
{
    private static readonly HashSet<string> IdentityInsertTables =
    [
        "Roles",
        "Permissions",
        "Users",
        "Sports",
        "Facilities",
        "Courts",
        "TimeSlots",
        "PricePolicies",
        "PriceRuleDetails",
        "PaymentMethods",
        "Promotions",
        "Bookings"
    ];

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportHubDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<SportHubDbContext>>();

        try
        {
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrated successfully.");

            await SeedRolesAndPermissionsAsync(db, logger);
            await SeedSportsAsync(db, logger);
            await SeedFacilitiesAsync(db, logger);
            await SeedUsersAsync(db, logger);
            await SeedCourtsAsync(db, logger);
            await SeedMaintenanceFixturesAsync(db, logger);
            await SeedTimeSlotsAsync(db, logger);
            await SeedPricePoliciesAsync(db, logger);
            await SeedPaymentMethodsAsync(db, logger);
            await SeedPromotionsAsync(db, logger);
            await SeedSystemSettingsAsync(db, logger);
            await SeedSampleBookingsAsync(db, logger);
            await SeedRealtimeConflictFixturesAsync(db, logger);
            await SeedAdditionalBookingFixturesAsync(db, logger);

            logger.LogInformation("Seeding completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROLES & PERMISSIONS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedRolesAndPermissionsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Roles.AnyAsync()) return;

        logger.LogInformation("Seeding roles and permissions...");

        var roles = new List<Role>
        {
            new() { Id = 1, RoleCode = "ADMIN",  RoleName = "Quan tri vien",  Description = "Toan quyen quan ly he thong" },
            new() { Id = 2, RoleCode = "STAFF",  RoleName = "Nhan vien",      Description = "Quan ly dat san va check-in tai co so" },
            new() { Id = 3, RoleCode = "PLAYER", RoleName = "Nguoi choi",     Description = "Tai khoan khach hang dat san online" },
        };

        var resources = new[] { "FACILITY", "COURT", "BOOKING", "PRICING", "PROMOTION", "USER", "REPORT", "SYSTEM" };
        var actions   = new[] { "CREATE", "READ", "UPDATE", "DELETE" };

        var permissions = new List<Permission>();
        int permId = 1;
        foreach (var resource in resources)
            foreach (var action in actions)
                permissions.Add(new Permission
                {
                    Id          = permId++,
                    Resource    = resource,
                    Action      = action,
                    Description = $"{action} {resource}"
                });

        // Admin gets all permissions
        var adminRolePerms = permissions.Select(p => new RolePermission
        {
            RoleId       = 1,
            PermissionId = p.Id,
            IsGranted    = true
        }).ToList();

        // Staff gets READ on everything + CREATE/UPDATE on BOOKING & COURT
        var staffAllowed = new[] { "BOOKING", "COURT", "FACILITY" };
        var staffRolePerms = permissions
            .Where(p => p.Action == "READ" || (staffAllowed.Contains(p.Resource) && p.Action != "DELETE"))
            .Select(p => new RolePermission
            {
                RoleId       = 2,
                PermissionId = p.Id,
                IsGranted    = true
            }).ToList();

        // Player gets READ only on facility/court/pricing/booking
        var playerAllowed = new[] { "FACILITY", "COURT", "PRICING", "BOOKING" };
        var playerRolePerms = permissions
            .Where(p => playerAllowed.Contains(p.Resource) && p.Action == "READ")
            .Select(p => new RolePermission
            {
                RoleId       = 3,
                PermissionId = p.Id,
                IsGranted    = true
            }).ToList();

        await db.Roles.AddRangeAsync(roles);
        await SaveChangesWithIdentityInsertAsync(db, "Roles");

        await db.Permissions.AddRangeAsync(permissions);
        await SaveChangesWithIdentityInsertAsync(db, "Permissions");

        await db.RolePermissions.AddRangeAsync(adminRolePerms);
        await db.RolePermissions.AddRangeAsync(staffRolePerms);
        await db.RolePermissions.AddRangeAsync(playerRolePerms);
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USERS  (password "Test@1234" – BCrypt hash pre-computed)
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedUsersAsync(SportHubDbContext db, ILogger logger)
    {
        // BCrypt hash of "Test@1234" (cost factor 12)
        const string pwHash = "$2a$12$K5G0jRCM6bkKDn5OVeT3xuiZjRoUEjDaqlJd3RJjdJ0OBWiMfyU0S";

        var users = new List<User>
        {
            // ── ADMIN ──────────────────────────────────────────────────────
            new() { Id = 1,  FullName = "Super Admin",       PhoneNumber = "0900000001", PasswordHash = pwHash, IsActive = true },

            // ── STAFF ──────────────────────────────────────────────────────
            new() { Id = 2,  FullName = "Nguyen Van An",     PhoneNumber = "0911111111", PasswordHash = pwHash, IsActive = true },
            new() { Id = 3,  FullName = "Tran Thi Binh",     PhoneNumber = "0911111112", PasswordHash = pwHash, IsActive = true },
            new() { Id = 4,  FullName = "Le Hoang Cuong",    PhoneNumber = "0911111113", PasswordHash = pwHash, IsActive = true },

            // ── PLAYERS ────────────────────────────────────────────────────
            new() { Id = 5,  FullName = "Pham Minh Dung",    PhoneNumber = "0922222201", PasswordHash = pwHash, IsActive = true },
            new() { Id = 6,  FullName = "Hoang Thi Lan",     PhoneNumber = "0922222202", PasswordHash = pwHash, IsActive = true },
            new() { Id = 7,  FullName = "Vu Duc Khai",       PhoneNumber = "0922222203", PasswordHash = pwHash, IsActive = true },
            new() { Id = 8,  FullName = "Ngo Thi Mai",       PhoneNumber = "0922222204", PasswordHash = pwHash, IsActive = true },
            new() { Id = 9,  FullName = "Dinh Van Nam",      PhoneNumber = "0922222205", PasswordHash = pwHash, IsActive = true },
            new() { Id = 10, FullName = "Bui Thi Oanh",      PhoneNumber = "0922222206", PasswordHash = pwHash, IsActive = true },
        };

        var userRoles = new List<UserRole>
        {
            new() { UserId = 1,  RoleId = 1 },
            new() { UserId = 2,  RoleId = 2 },
            new() { UserId = 3,  RoleId = 2 },
            new() { UserId = 4,  RoleId = 2 },
            new() { UserId = 5,  RoleId = 3 },
            new() { UserId = 6,  RoleId = 3 },
            new() { UserId = 7,  RoleId = 3 },
            new() { UserId = 8,  RoleId = 3 },
            new() { UserId = 9,  RoleId = 3 },
            new() { UserId = 10, RoleId = 3 },
        };

        if (!await db.Users.AnyAsync())
        {
            logger.LogInformation("Seeding users...");
            await db.Users.AddRangeAsync(users);
            await SaveChangesWithIdentityInsertAsync(db, "Users");

            await db.UserRoles.AddRangeAsync(userRoles);
            await db.SaveChangesAsync();
        }

        var staffProfiles = new List<StaffProfile>
        {
            new() { UserId = 2, ManagedFacilityId = 1, Position = "Quan ly co so" },
            new() { UserId = 3, ManagedFacilityId = 2, Position = "Quan ly co so" },
            new() { UserId = 4, ManagedFacilityId = 1, Position = "Nhan vien le tan" },
        };
        await AddMissingSeedProfilesAsync(
            db,
            staffProfiles,
            users.Where(user => user.Id is 2 or 3 or 4).ToDictionary(user => user.Id, user => user.PhoneNumber),
            db.StaffProfiles.Select(profile => profile.UserId));

        // Player profiles
        var playerProfiles = new List<PlayerProfile>
        {
            new() { UserId = 5,  ReputationScore = 100, NumericSkillRating = 3.50m, SkillLevel = "Intermediate", LoyaltyPoints = 250,  CurrentTier = "Silver" },
            new() { UserId = 6,  ReputationScore = 95,  NumericSkillRating = 2.10m, SkillLevel = "Beginner",     LoyaltyPoints = 50,   CurrentTier = "Bronze" },
            new() { UserId = 7,  ReputationScore = 100, NumericSkillRating = 4.20m, SkillLevel = "Advanced",     LoyaltyPoints = 800,  CurrentTier = "Gold"   },
            new() { UserId = 8,  ReputationScore = 80,  NumericSkillRating = 2.50m, SkillLevel = "Beginner",     LoyaltyPoints = 30,   CurrentTier = "Bronze" },
            new() { UserId = 9,  ReputationScore = 100, NumericSkillRating = 3.80m, SkillLevel = "Intermediate", LoyaltyPoints = 410,  CurrentTier = "Silver" },
            new() { UserId = 10, ReputationScore = 60,  NumericSkillRating = 2.00m, SkillLevel = "Beginner",     LoyaltyPoints = 10,   CurrentTier = "Bronze" },
        };
        await AddMissingSeedProfilesAsync(
            db,
            playerProfiles,
            users.Where(user => user.Id is >= 5 and <= 10).ToDictionary(user => user.Id, user => user.PhoneNumber),
            db.PlayerProfiles.Select(profile => profile.UserId));
    }

    private static async Task AddMissingSeedProfilesAsync<TProfile>(
        SportHubDbContext db,
        IReadOnlyCollection<TProfile> seedProfiles,
        IReadOnlyDictionary<int, string> seededUserPhones,
        IQueryable<int> existingProfileUserIds)
        where TProfile : class
    {
        var seededPhones = seededUserPhones.Values.ToList();
        var usersWithSeededPhones = await db.Users
            .Where(user => seededPhones.Contains(user.PhoneNumber))
            .Select(user => new { user.Id, user.PhoneNumber })
            .ToListAsync();
        var existingSeededUserIds = usersWithSeededPhones
            .Where(user => seededUserPhones.TryGetValue(user.Id, out var phone) &&
                           phone == user.PhoneNumber)
            .Select(user => user.Id)
            .ToList();
        var existingProfileIds = await existingProfileUserIds.ToListAsync();
        var missingProfiles = seedProfiles
            .Where(profile =>
            {
                var userId = profile switch
                {
                    StaffProfile staffProfile => staffProfile.UserId,
                    PlayerProfile playerProfile => playerProfile.UserId,
                    _ => throw new ArgumentOutOfRangeException(nameof(profile))
                };
                return existingSeededUserIds.Contains(userId) && !existingProfileIds.Contains(userId);
            })
            .ToList();

        if (missingProfiles.Count == 0) return;

        await db.AddRangeAsync(missingProfiles);
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SPORTS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedSportsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Sports.AnyAsync()) return;

        logger.LogInformation("Seeding sports...");

        var sports = new List<Sport>
        {
            new() { Id = 1, SportCode = "BADMINTON",  SportName = "Cau long",        IsActive = true  },
            new() { Id = 2, SportCode = "PICKLEBALL", SportName = "Pickleball",      IsActive = true  },
            new() { Id = 3, SportCode = "FOOTBALL5",  SportName = "Bong da 5 nguoi", IsActive = true  },
            new() { Id = 4, SportCode = "TENNIS",     SportName = "Tennis",          IsActive = true  },
            new() { Id = 5, SportCode = "BASKETBALL", SportName = "Bong ro",         IsActive = false },
        };

        await db.Sports.AddRangeAsync(sports);
        await SaveChangesWithIdentityInsertAsync(db, "Sports");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FACILITIES
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedFacilitiesAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Facilities.AnyAsync()) return;

        logger.LogInformation("Seeding facilities...");

        var facilities = new List<Domain.Entities.Facility.Facility>
        {
            new()
            {
                Id        = 1,
                Name      = "SportHub Quan 7",
                Address   = "123 Nguyen Thi Thap, Phuong Tan Phu, Quan 7, TP.HCM",
                Hotline   = "028 1234 5678",
                OpenTime  = new TimeOnly(6, 0),
                CloseTime = new TimeOnly(23, 0),
                IsActive  = true
            },
            new()
            {
                Id        = 2,
                Name      = "SportHub Binh Thanh",
                Address   = "456 Xo Viet Nghe Tinh, Phuong 26, Binh Thanh, TP.HCM",
                Hotline   = "028 8765 4321",
                OpenTime  = new TimeOnly(5, 30),
                CloseTime = new TimeOnly(22, 30),
                IsActive  = true
            },
        };

        await db.Facilities.AddRangeAsync(facilities);
        await SaveChangesWithIdentityInsertAsync(db, "Facilities");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COURTS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedCourtsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Courts.AnyAsync()) return;

        logger.LogInformation("Seeding courts...");

        var courts = new List<Court>
        {
            // ── Facility 1 – Quan 7 ───────────────────────────────────────
            // Cau long (Sport 1)
            new() { Id = 1,  FacilityId = 1, SportId = 1, CourtName = "San CL-01",  CourtType = CourtType.Indoor,  IsActive = true  },
            new() { Id = 2,  FacilityId = 1, SportId = 1, CourtName = "San CL-02",  CourtType = CourtType.Indoor,  IsActive = true  },
            new() { Id = 3,  FacilityId = 1, SportId = 1, CourtName = "San CL-03",  CourtType = CourtType.Indoor,  IsActive = true  },
            new() { Id = 4,  FacilityId = 1, SportId = 1, CourtName = "San CL-04",  CourtType = CourtType.Indoor,  IsActive = true  },

            // Pickleball (Sport 2)
            new() { Id = 5,  FacilityId = 1, SportId = 2, CourtName = "San PB-01",  CourtType = CourtType.Outdoor, IsActive = true  },
            new() { Id = 6,  FacilityId = 1, SportId = 2, CourtName = "San PB-02",  CourtType = CourtType.Outdoor, IsActive = true  },

            // Bong da 5 (Sport 3)
            new() { Id = 7,  FacilityId = 1, SportId = 3, CourtName = "San BD5-01", CourtType = CourtType.Outdoor, IsActive = true  },
            new() { Id = 8,  FacilityId = 1, SportId = 3, CourtName = "San BD5-02", CourtType = CourtType.Outdoor, IsActive = true  },

            // ── Facility 2 – Binh Thanh ───────────────────────────────────
            // Cau long (Sport 1)
            new() { Id = 9,  FacilityId = 2, SportId = 1, CourtName = "San CL-A1",  CourtType = CourtType.Indoor,  IsActive = true  },
            new() { Id = 10, FacilityId = 2, SportId = 1, CourtName = "San CL-A2",  CourtType = CourtType.Indoor,  IsActive = true  },

            // Pickleball (Sport 2)
            new() { Id = 11, FacilityId = 2, SportId = 2, CourtName = "San PB-A1",  CourtType = CourtType.Indoor,  IsActive = true  },
            new() { Id = 12, FacilityId = 2, SportId = 2, CourtName = "San PB-A2",  CourtType = CourtType.Indoor,  IsActive = true  },

            // Tennis (Sport 4)
            new() { Id = 13, FacilityId = 2, SportId = 4, CourtName = "San TN-01",  CourtType = CourtType.Outdoor, IsActive = true  },
            new() { Id = 14, FacilityId = 2, SportId = 4, CourtName = "San TN-02",  CourtType = CourtType.Outdoor, IsActive = true  },
        };

        await db.Courts.AddRangeAsync(courts);
        await SaveChangesWithIdentityInsertAsync(db, "Courts");

    }

    private static async Task SeedMaintenanceFixturesAsync(SportHubDbContext db, ILogger logger)
    {
        var court = await db.Courts.FirstOrDefaultAsync(item =>
            item.Id == 4 &&
            item.CourtName == "San CL-04" &&
            item.FacilityId == 1 &&
            item.SportId == 1);
        if (court is null) return;

        court.IsActive = true;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")));
        var fixtures = new[]
        {
            (Date: today, Start: new TimeOnly(6, 0), End: new TimeOnly(18, 0),
                Reason: "Thay tham san va kiem tra he thong chieu sang"),
            (Date: today.AddDays(1), Start: new TimeOnly(6, 0), End: new TimeOnly(12, 0),
                Reason: "Hoan thien thi cong tham san")
        };

        foreach (var fixture in fixtures)
        {
            var exists = await db.CourtMaintenances.AnyAsync(item =>
                item.CourtId == court.Id &&
                item.MaintenanceDate == fixture.Date &&
                item.StartTime == fixture.Start &&
                item.EndTime == fixture.End);
            if (exists) continue;

            var maintenance = new CourtMaintenance
            {
                CourtId = court.Id,
                MaintenanceDate = fixture.Date,
                StartTime = fixture.Start,
                EndTime = fixture.End,
                Reason = fixture.Reason,
                CreatedByUserId = 2
            };
            db.CourtMaintenances.Add(maintenance);
            db.Entry(maintenance).Property<int>("CreatedById").CurrentValue = maintenance.CreatedByUserId;
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Ensured maintenance fixtures for court {CourtId}.", court.Id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIME SLOTS  (6:00 – 23:00, each slot = 1 hour)
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedTimeSlotsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.TimeSlots.AnyAsync()) return;

        logger.LogInformation("Seeding time slots...");

        // Peak: 17:00 – 21:00
        var peakStart = new TimeOnly(17, 0);
        var peakEnd   = new TimeOnly(21, 0);

        var slots = new List<TimeSlot>();
        const int startHour = 6;
        const int endHour   = 23;

        for (int h = startHour; h < endHour; h++)
        {
            var slotStart = new TimeOnly(h, 0);
            var slotEnd   = new TimeOnly(h + 1, 0);
            slots.Add(new TimeSlot
            {
                Id            = h - startHour + 1,
                SlotIndex     = h - startHour + 1,
                StartTime     = slotStart,
                EndTime       = slotEnd,
                IsDefaultPeak = slotStart >= peakStart && slotEnd <= peakEnd
            });
        }

        await db.TimeSlots.AddRangeAsync(slots);
        await SaveChangesWithIdentityInsertAsync(db, "TimeSlots");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRICE POLICIES & RULE DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedPricePoliciesAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.PricePolicies.AnyAsync()) return;

        logger.LogInformation("Seeding price policies and rule details...");

        var effectiveFrom = new DateOnly(2024, 1, 1);

        var policyDefs = new[]
        {
            // (FacilityId, SportId, BasePrice/h, WeekendSurcharge%, PolicyId)
            (FacId: 1, SportId: 1, Base: 80_000m,  Weekend: 20m, Id: 1),  // Quan 7 – Cau long
            (FacId: 1, SportId: 2, Base: 120_000m, Weekend: 15m, Id: 2),  // Quan 7 – Pickleball
            (FacId: 1, SportId: 3, Base: 300_000m, Weekend: 25m, Id: 3),  // Quan 7 – Bong da 5
            (FacId: 2, SportId: 1, Base: 70_000m,  Weekend: 20m, Id: 4),  // Binh Thanh – Cau long
            (FacId: 2, SportId: 2, Base: 110_000m, Weekend: 15m, Id: 5),  // Binh Thanh – Pickleball
            (FacId: 2, SportId: 4, Base: 150_000m, Weekend: 30m, Id: 6),  // Binh Thanh – Tennis
        };

        var policies = policyDefs.Select(p => new PricePolicy
        {
            Id                      = p.Id,
            FacilityId              = p.FacId,
            SportId                 = p.SportId,
            BasePrice               = p.Base,
            WeekendSurchargePercent = p.Weekend,
            EffectiveFrom           = effectiveFrom,
            IsActive                = true
        }).ToList();

        await db.PricePolicies.AddRangeAsync(policies);
        await SaveChangesWithIdentityInsertAsync(db, "PricePolicies");

        // PriceRuleDetails: peak = Base * 1.3, off-peak = Base
        var timeSlots   = await db.TimeSlots.ToListAsync();
        var ruleDetails = new List<PriceRuleDetail>();
        int ruleId = 1;

        foreach (var policy in policyDefs)
        {
            foreach (var slot in timeSlots)
            {
                bool isPeak = slot.IsDefaultPeak;
                decimal rate = isPeak
                    ? Math.Round(policy.Base * 1.3m / 1000m) * 1000m  // round to nearest 1000 VND
                    : policy.Base;

                ruleDetails.Add(new PriceRuleDetail
                {
                    Id         = ruleId++,
                    PolicyId   = policy.Id,
                    TimeSlotId = slot.Id,
                    HourlyRate = rate,
                    IsPeakHour = isPeak
                });
            }
        }

        await db.PriceRuleDetails.AddRangeAsync(ruleDetails);
        await SaveChangesWithIdentityInsertAsync(db, "PriceRuleDetails");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT METHODS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedPaymentMethodsAsync(SportHubDbContext db, ILogger logger)
    {
        if (!await db.PaymentMethods.AnyAsync())
        {
            logger.LogInformation("Seeding payment methods...");
            var methods = new List<PaymentMethod>
            {
                new() { Id = 1, MethodCode = "CASH",        MethodName = "Tien mat",                     IsActive = true  },
                new() { Id = 2, MethodCode = "QR_TRANSFER", MethodName = "Chuyen khoan QR (VietQR)",     IsActive = true  },
                new() { Id = 3, MethodCode = "MOCK_ONLINE", MethodName = "Thanh toan Online (Gia lap)",  IsActive = true  },
                new() { Id = 4, MethodCode = "MOMO",        MethodName = "Vi MoMo",                      IsActive = false },
            };

            await db.PaymentMethods.AddRangeAsync(methods);
            await SaveChangesWithIdentityInsertAsync(db, "PaymentMethods");
        }

        if (!await db.PaymentMethods.AnyAsync(method => method.MethodCode == "VNPAY"))
        {
            await db.PaymentMethods.AddAsync(new PaymentMethod
            {
                MethodCode = "VNPAY",
                MethodName = "VNPay",
                IsActive = true
            });
            await db.SaveChangesAsync();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMOTIONS & USER VOUCHERS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedPromotionsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Promotions.AnyAsync()) return;

        logger.LogInformation("Seeding promotions and vouchers...");

        var now = DateTime.UtcNow;

        var promotions = new List<Promotion>
        {
            new()
            {
                Id                = 1,
                PromoCode         = "WELCOME20",
                Title             = "Chao mung thanh vien moi - Giam 20%",
                DiscountType      = "Percentage",
                DiscountValue     = 20m,
                MaxDiscountAmount = 50_000m,
                MinOrderAmount    = 100_000m,
                UsageLimitTotal   = 500,
                UsageLimitPerUser = 1,
                StartDate         = now.AddDays(-30),
                EndDate           = now.AddDays(60),
                IsOffPeakOnly     = false,
                IsActive          = true
            },
            new()
            {
                Id                = 2,
                PromoCode         = "OFFPEAK30",
                Title             = "Gio vang - Giam 30% gio thap diem",
                DiscountType      = "Percentage",
                DiscountValue     = 30m,
                MaxDiscountAmount = 80_000m,
                MinOrderAmount    = 0m,
                UsageLimitTotal   = null,
                UsageLimitPerUser = 5,
                StartDate         = now.AddDays(-7),
                EndDate           = now.AddDays(90),
                IsOffPeakOnly     = true,
                IsActive          = true
            },
            new()
            {
                Id                = 3,
                PromoCode         = "FLAT50K",
                Title             = "Giam thang 50.000d cho don tu 200k",
                DiscountType      = "FixedAmount",
                DiscountValue     = 50_000m,
                MaxDiscountAmount = null,
                MinOrderAmount    = 200_000m,
                UsageLimitTotal   = 200,
                UsageLimitPerUser = 2,
                StartDate         = now.AddDays(-14),
                EndDate           = now.AddDays(14),
                IsOffPeakOnly     = false,
                IsActive          = true
            },
            new()
            {
                Id                = 4,
                PromoCode         = "BIRTHDAY10",
                Title             = "Sinh nhat - Giam 10%",
                DiscountType      = "Percentage",
                DiscountValue     = 10m,
                MaxDiscountAmount = 30_000m,
                MinOrderAmount    = 0m,
                UsageLimitTotal   = null,
                UsageLimitPerUser = 1,
                StartDate         = now.AddDays(-1),
                EndDate           = now.AddDays(365),
                IsOffPeakOnly     = false,
                IsActive          = true
            },
            new()
            {
                Id                = 5,
                PromoCode         = "EXPIRED_OLD",
                Title             = "Khuyen mai da het han (test)",
                DiscountType      = "Percentage",
                DiscountValue     = 15m,
                MaxDiscountAmount = 40_000m,
                MinOrderAmount    = 0m,
                UsageLimitTotal   = 100,
                UsageLimitPerUser = 1,
                StartDate         = now.AddDays(-60),
                EndDate           = now.AddDays(-1),
                IsOffPeakOnly     = false,
                IsActive          = false
            },
        };

        await db.Promotions.AddRangeAsync(promotions);
        await SaveChangesWithIdentityInsertAsync(db, "Promotions");

        var vouchers = new List<UserVoucher>
        {
            new() { UserId = 5,  PromotionId = 1, IsUsed = false, AssignedReason = "WelcomeGift"        },
            new() { UserId = 5,  PromotionId = 2, IsUsed = true,  UsedAt = now.AddDays(-5), AssignedReason = "Manual" },
            new() { UserId = 6,  PromotionId = 1, IsUsed = false, AssignedReason = "WelcomeGift"        },
            new() { UserId = 7,  PromotionId = 3, IsUsed = false, AssignedReason = "LoyaltyTierReward"  },
            new() { UserId = 7,  PromotionId = 4, IsUsed = false, AssignedReason = "BirthdayGift"       },
            new() { UserId = 9,  PromotionId = 2, IsUsed = false, AssignedReason = "WinBack"            },
        };

        await db.UserVouchers.AddRangeAsync(vouchers);
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SYSTEM SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedSystemSettingsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.SystemSettings.AnyAsync()) return;

        logger.LogInformation("Seeding system settings...");

        var settings = new List<SystemSetting>
        {
            new() { ParamKey = "HOLD_DURATION_MINUTES",      ParamValue = "10",    Description = "Thoi gian giu cho tam (phut) truoc khi tu huy" },
            new() { ParamKey = "MIN_REPUTATION_BOOKING",     ParamValue = "60",    Description = "Diem uy tin toi thieu de duoc dat san" },
            new() { ParamKey = "LOYALTY_POINTS_PER_100K",    ParamValue = "10",    Description = "Diem loyalty tich duoc cho moi 100.000d chi tieu" },
            new() { ParamKey = "CANCELLATION_FREE_HOURS",    ParamValue = "24",    Description = "So gio truoc gio choi duoc huy mien phi" },
            new() { ParamKey = "CANCELLATION_PENALTY_50PCT", ParamValue = "4",     Description = "So gio truoc gio choi bi phat 50%" },
            new() { ParamKey = "PEAK_HOURS_START",           ParamValue = "17:00", Description = "Gio bat dau khung cao diem (HH:mm)" },
            new() { ParamKey = "PEAK_HOURS_END",             ParamValue = "21:00", Description = "Gio ket thuc khung cao diem (HH:mm)" },
            new() { ParamKey = "MAX_BOOKING_DAYS_AHEAD",     ParamValue = "30",    Description = "So ngay toi da co the dat truoc" },
            new() { ParamKey = "MAX_SLOTS_PER_BOOKING",      ParamValue = "4",     Description = "So slot toi da trong mot lan dat" },
            new() { ParamKey = "JWT_EXPIRY_MINUTES",         ParamValue = "60",    Description = "Thoi gian het han Access Token (phut)" },
            new() { ParamKey = "REFRESH_TOKEN_EXPIRY_DAYS",  ParamValue = "7",     Description = "Thoi gian het han Refresh Token (ngay)" },
        };

        await db.SystemSettings.AddRangeAsync(settings);
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SAMPLE BOOKINGS  (test all statuses)
    // ─────────────────────────────────────────────────────────────────────────
    private static async Task SeedSampleBookingsAsync(SportHubDbContext db, ILogger logger)
    {
        if (await db.Bookings.AnyAsync()) return;

        logger.LogInformation("Seeding sample bookings...");

        var today     = DateOnly.FromDateTime(DateTime.Today);
        var yesterday = today.AddDays(-1);
        var tomorrow  = today.AddDays(1);
        var now       = DateTime.UtcNow;

        // Slot reference (slotIndex = hour - 6 + 1):
        // Slot 1=06:00, Slot 2=07:00, Slot 4=09:00, Slot 5=10:00 (off-peak)
        // Slot 12=17:00, Slot 13=18:00, Slot 14=19:00, Slot 15=20:00 (peak)

        var bookings = new List<Domain.Entities.Booking.Booking>
        {
            // ── 1. Completed – Player 5, Court CL-01, yesterday ─────────
            new()
            {
                Id            = 1,
                BookingCode   = "BK20241017001",
                UserId        = 5,
                TotalAmount   = 208_000m,   // 80k * 1.3 * 2 slots peak
                DiscountAmount= 0m,
                FinalAmount   = 208_000m,
                BookingStatus = BookingStatus.Completed,
                Details =
                [
                    new() { CourtId = 1, PlayDate = yesterday, TimeSlotId = 12, SlotPrice = 104_000m },
                    new() { CourtId = 1, PlayDate = yesterday, TimeSlotId = 13, SlotPrice = 104_000m },
                ]
            },

            // ── 2. Confirmed – Player 7, Court PB-01, today (future) ────
            new()
            {
                Id            = 2,
                BookingCode   = "BK20241018001",
                UserId        = 7,
                TotalAmount   = 312_000m,   // 120k * 1.3 * 2 slots peak
                DiscountAmount= 0m,
                FinalAmount   = 312_000m,
                BookingStatus = BookingStatus.Confirmed,
                Details =
                [
                    new() { CourtId = 5, PlayDate = today, TimeSlotId = 12, SlotPrice = 156_000m },
                    new() { CourtId = 5, PlayDate = today, TimeSlotId = 13, SlotPrice = 156_000m },
                ]
            },

            // ── 3. Held – Player 6, Court CL-02, today, expires in 5min ─
            new()
            {
                Id            = 3,
                BookingCode   = "BK20241018002",
                UserId        = 6,
                TotalAmount   = 80_000m,
                DiscountAmount= 0m,
                FinalAmount   = 80_000m,
                HoldExpiresAt = now.AddMinutes(5),
                BookingStatus = BookingStatus.Held,
                Details =
                [
                    new() { CourtId = 2, PlayDate = today, TimeSlotId = 4, SlotPrice = 80_000m },
                ]
            },

            // ── 4. Cancelled – Player 8, Court BD5-01, today ───────────
            new()
            {
                Id            = 4,
                BookingCode   = "BK20241018003",
                UserId        = 8,
                TotalAmount   = 300_000m,
                DiscountAmount= 0m,
                FinalAmount   = 300_000m,
                BookingStatus = BookingStatus.Cancelled,
                Details =
                [
                    new() { CourtId = 7, PlayDate = today, TimeSlotId = 4, SlotPrice = 300_000m },
                ]
            },

            // ── 5. Confirmed with discount – Player 9, tomorrow ─────────
            new()
            {
                Id            = 5,
                BookingCode   = "BK20241019001",
                UserId        = 9,
                TotalAmount   = 240_000m,
                DiscountAmount= 48_000m,    // 20% WELCOME20
                FinalAmount   = 192_000m,
                BookingStatus = BookingStatus.Confirmed,
                Details =
                [
                    new() { CourtId = 5, PlayDate = tomorrow, TimeSlotId = 4, SlotPrice = 120_000m },
                    new() { CourtId = 5, PlayDate = tomorrow, TimeSlotId = 5, SlotPrice = 120_000m },
                ]
            },

            // ── 6. Guest booking – Staff created at front desk ──────────
            new()
            {
                Id               = 6,
                BookingCode      = "BK20241018004",
                UserId           = null,
                GuestName        = "Khach vang lai A",
                GuestPhone       = "0999888777",
                TotalAmount      = 160_000m,
                DiscountAmount   = 0m,
                FinalAmount      = 160_000m,
                BookingStatus    = BookingStatus.Confirmed,
                CreatedByStaffId = 2,
                Details =
                [
                    new() { CourtId = 1, PlayDate = today, TimeSlotId = 2, SlotPrice = 80_000m },
                    new() { CourtId = 1, PlayDate = today, TimeSlotId = 3, SlotPrice = 80_000m },
                ]
            },

            // ── 7. NoShow – Player 10, Facility 2, yesterday ────────────
            new()
            {
                Id            = 7,
                BookingCode   = "BK20241017002",
                UserId        = 10,
                TotalAmount   = 70_000m,
                DiscountAmount= 0m,
                FinalAmount   = 70_000m,
                BookingStatus = BookingStatus.NoShow,
                Details =
                [
                    new() { CourtId = 9, PlayDate = yesterday, TimeSlotId = 4, SlotPrice = 70_000m },
                ]
            },
        };

        await db.Bookings.AddRangeAsync(bookings);
        await SaveChangesWithIdentityInsertAsync(db, "Bookings");

        // ── Payment transactions ─────────────────────────────────────────────
        var transactions = new List<PaymentTransaction>
        {
            // BK1 – Completed, paid cash
            new() { BookingId = 1, PaymentMethodId = 1, Amount = 208_000m, Status = PaymentStatus.Confirmed, ProcessedAt = now.AddDays(-1) },
            // BK2 – Confirmed, paid QR
            new() { BookingId = 2, PaymentMethodId = 2, Amount = 312_000m, Status = PaymentStatus.Confirmed, ProcessedAt = now.AddHours(-3), ReferenceCode = "VQR20241018001" },
            // BK3 – Held, payment pending
            new() { BookingId = 3, PaymentMethodId = 3, Amount = 80_000m,  Status = PaymentStatus.Pending,   ProcessedAt = null },
            // BK5 – Confirmed with discount, paid online
            new() { BookingId = 5, PaymentMethodId = 3, Amount = 192_000m, Status = PaymentStatus.Confirmed, ProcessedAt = now.AddHours(-2), ReferenceCode = "ONLINE20241019001" },
            // BK6 – Guest, paid cash by staff
            new() { BookingId = 6, PaymentMethodId = 1, Amount = 160_000m, Status = PaymentStatus.Confirmed, ProcessedAt = now.AddHours(-1), StaffVerifierId = 2 },
        };

        await db.PaymentTransactions.AddRangeAsync(transactions);
        await db.SaveChangesAsync();

        // ── Cancellation for BK4 ────────────────────────────────────────────
        await db.BookingCancellations.AddAsync(new BookingCancellation
        {
            BookingId         = 4,
            CancelledByUserId = 8,
            CancelledAt       = now.AddHours(-6),
            CancelReason      = "Ban dot xuat khong the den san",
            RefundPercent     = 100m,
            RefundAmount      = 300_000m,
            PenaltyAmount     = 0m
        });
        await db.SaveChangesAsync();

        // ── Check-in log for BK1 (completed) ───────────────────────────────
        var detail1 = await db.BookingDetails.FirstAsync(d => d.BookingId == 1);
        await db.CheckInLogs.AddAsync(new CheckInLog
        {
            BookingDetailId   = detail1.Id,
            ParticipantUserId = 5,
            StaffUserId       = 2,
            CheckInAt         = now.AddDays(-1).AddHours(11),  // ~17:00 yesterday
            CheckInChannel    = CheckInChannel.QRCode
        });
        await db.SaveChangesAsync();

        // ── Loyalty history ─────────────────────────────────────────────────
        var loyaltyHistories = new List<LoyaltyHistory>
        {
            new() { UserId = 5,  PointsChanged = +20,  Reason = "Tich diem don BK20241017001", RelatedBookingId = 1 },
            new() { UserId = 7,  PointsChanged = +31,  Reason = "Tich diem don BK20241018001", RelatedBookingId = 2 },
            new() { UserId = 9,  PointsChanged = +19,  Reason = "Tich diem don BK20241019001", RelatedBookingId = 5 },
            new() { UserId = 5,  PointsChanged = -100, Reason = "Doi diem lay voucher FLAT50K",  RelatedBookingId = null },
        };
        await db.LoyaltyHistories.AddRangeAsync(loyaltyHistories);
        await db.SaveChangesAsync();
    }

    private static async Task SeedRealtimeConflictFixturesAsync(SportHubDbContext db, ILogger logger)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")));

        if (!await db.SocialSessions.AnyAsync(session => session.Title == "TV1-DEMO-SOCIAL"))
        {
            var session = new SocialSession
            {
                FacilityId = 1,
                SportId = 1,
                CreatedByStaffId = 2,
                Title = "TV1-DEMO-SOCIAL",
                PlayDate = today.AddDays(2),
                StartTime = new TimeOnly(18, 0),
                EndTime = new TimeOnly(20, 0),
                MaxParticipants = 12,
                FeePerSlot = 25_000m,
                MinSkill = 1.00m,
                MaxSkill = 5.00m,
                Status = "Published",
                Description = "Buổi giao lưu mẫu để kiểm thử trạng thái sân Social."
            };
            session.SessionCourts.Add(new SocialSessionCourt { CourtId = 3 });
            db.SocialSessions.Add(session);
            await db.SaveChangesAsync();
        }

        if (!await db.Tournaments.AnyAsync(tournament => tournament.Name == "TV1-DEMO-TOURNAMENT"))
        {
            var tournament = new Tournament
            {
                FacilityId = 2,
                SportId = 4,
                Name = "TV1-DEMO-TOURNAMENT",
                TournamentType = "SingleElimination",
                RegistrationDeadline = DateTime.UtcNow.AddDays(1),
                StartDate = today.AddDays(3),
                EndDate = today.AddDays(3),
                MaxTeams = 8,
                EntryFee = 100_000m,
                PrizeDescription = "Giải mẫu phục vụ kiểm thử lịch sân.",
                Status = "InProgress",
                CreatedByStaffId = 3
            };
            tournament.Matches.Add(new TournamentMatch
            {
                RoundNumber = 1,
                MatchOrder = 1,
                CourtId = 13,
                ScheduledStartTime = today.AddDays(3).ToDateTime(new TimeOnly(18, 0)),
                Status = "Scheduled"
            });
            db.Tournaments.Add(tournament);
            await db.SaveChangesAsync();
        }
    }

    private static async Task SeedAdditionalBookingFixturesAsync(SportHubDbContext db, ILogger logger)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")));
        var now = DateTime.UtcNow;
        var existingCodes = await db.Bookings
            .AsNoTracking()
            .Where(booking => booking.BookingCode.StartsWith("TV1DEMO"))
            .Select(booking => booking.BookingCode)
            .ToListAsync();
        var existingCodeSet = existingCodes.ToHashSet(StringComparer.Ordinal);

        var courts = await db.Courts.AsNoTracking().ToDictionaryAsync(court => court.Id);
        var policies = await db.PricePolicies
            .AsNoTracking()
            .Include(policy => policy.PriceRuleDetails)
            .Where(policy => policy.IsActive)
            .ToListAsync();
        var fixtures = new List<(int UserId, int CourtId, DateOnly Date, int SlotId, BookingStatus Status, int HoldMinutes)>();

        for (var index = 0; index < 24; index++)
        {
            var dayOffset = -(index + 1);
            var courtId = new[] { 1, 2, 5, 7, 9, 10 }[index % 6];
            var slotId = new[] { 4, 5, 8, 12, 13, 14 }[index % 6];
            var status = (index % 8) switch
            {
                0 => BookingStatus.NoShow,
                1 => BookingStatus.Cancelled,
                _ => BookingStatus.Completed
            };
            fixtures.Add((5 + index % 6, courtId, today.AddDays(dayOffset), slotId, status, 0));
        }

        fixtures.AddRange(
        [
            (5, 1, today.AddDays(1), 12, BookingStatus.Held, 9),
            (6, 1, today.AddDays(1), 13, BookingStatus.Confirmed, 0),
            (7, 2, today.AddDays(1), 14, BookingStatus.Confirmed, 0),
            (8, 9, today.AddDays(2), 12, BookingStatus.Confirmed, 0),
            (9, 10, today.AddDays(4), 1, BookingStatus.Held, 9),
            (10, 7, today.AddDays(5), 16, BookingStatus.Confirmed, 0)
        ]);

        var bookings = new List<Domain.Entities.Booking.Booking>();
        for (var index = 0; index < fixtures.Count; index++)
        {
            var fixture = fixtures[index];
            var bookingCode = $"TV1DEMO{today:yyyyMMdd}{index + 1:000}";
            if (existingCodeSet.Contains(bookingCode)) continue;
            if (!courts.TryGetValue(fixture.CourtId, out var court))
                throw new InvalidOperationException($"Seed court {fixture.CourtId} does not exist.");

            var policy = policies
                .Where(candidate =>
                    candidate.FacilityId == court.FacilityId &&
                    candidate.SportId == court.SportId &&
                    candidate.EffectiveFrom <= fixture.Date)
                .OrderByDescending(candidate => candidate.EffectiveFrom)
                .ThenByDescending(candidate => candidate.Id)
                .FirstOrDefault();
            var rule = policy?.PriceRuleDetails.FirstOrDefault(detail => detail.TimeSlotId == fixture.SlotId)
                ?? throw new InvalidOperationException(
                    $"Seed price is missing for court {fixture.CourtId}, date {fixture.Date}, slot {fixture.SlotId}.");
            var isWeekend = fixture.Date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var price = decimal.Round(
                rule.HourlyRate * (isWeekend ? 1m + policy!.WeekendSurchargePercent / 100m : 1m),
                2,
                MidpointRounding.AwayFromZero);

            bookings.Add(new Domain.Entities.Booking.Booking
            {
                BookingCode = bookingCode,
                UserId = fixture.UserId,
                TotalAmount = price,
                DiscountAmount = 0m,
                FinalAmount = price,
                HoldExpiresAt = fixture.Status == BookingStatus.Held ? now.AddMinutes(fixture.HoldMinutes) : null,
                BookingStatus = fixture.Status,
                Details =
                [
                    new()
                    {
                        CourtId = fixture.CourtId,
                        PlayDate = fixture.Date,
                        TimeSlotId = fixture.SlotId,
                        SlotPrice = price
                    }
                ]
            });
        }

        if (bookings.Count == 0) return;

        logger.LogInformation("Seeding {Count} additional booking fixtures.", bookings.Count);
        await db.Bookings.AddRangeAsync(bookings);
        await db.SaveChangesAsync();
    }

    private static async Task SaveChangesWithIdentityInsertAsync(
        SportHubDbContext db,
        string tableName)
    {
        if (!IdentityInsertTables.Contains(tableName))
            throw new ArgumentOutOfRangeException(nameof(tableName), "Unsupported identity table.");

        await db.Database.OpenConnectionAsync();
        var identityInsertEnabled = false;

        try
        {
            var enableCommand = string.Concat("SET IDENTITY_INSERT [dbo].[", tableName, "] ON");
            await db.Database.ExecuteSqlRawAsync(enableCommand);
            identityInsertEnabled = true;
            await db.SaveChangesAsync();
        }
        finally
        {
            try
            {
                if (identityInsertEnabled)
                {
                    var disableCommand = string.Concat("SET IDENTITY_INSERT [dbo].[", tableName, "] OFF");
                    await db.Database.ExecuteSqlRawAsync(disableCommand);
                }
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
    }
}
