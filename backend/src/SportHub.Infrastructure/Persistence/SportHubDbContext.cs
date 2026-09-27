using Microsoft.EntityFrameworkCore;
using SportHub.Domain.Entities;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Matching;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Notifications;
using SportHub.Domain.Entities.Player;
using SportHub.Domain.Entities.System;

namespace SportHub.Infrastructure.Persistence;

public class SportHubDbContext(DbContextOptions<SportHubDbContext> options) : DbContext(options)
{
    // Auth
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();
    public DbSet<StaffPermissionOverride> StaffPermissionOverrides => Set<StaffPermissionOverride>();

    // Facility
    public DbSet<Domain.Entities.Facility.Facility> Facilities => Set<Domain.Entities.Facility.Facility>();
    public DbSet<Sport> Sports => Set<Sport>();
    public DbSet<Court> Courts => Set<Court>();
    public DbSet<CourtMaintenance> CourtMaintenances => Set<CourtMaintenance>();

    // Pricing
    public DbSet<TimeSlot> TimeSlots => Set<TimeSlot>();
    public DbSet<PricePolicy> PricePolicies => Set<PricePolicy>();
    public DbSet<PriceRuleDetail> PriceRuleDetails => Set<PriceRuleDetail>();

    // Booking
    public DbSet<Domain.Entities.Booking.Booking> Bookings => Set<Domain.Entities.Booking.Booking>();
    public DbSet<BookingDetail> BookingDetails => Set<BookingDetail>();
    public DbSet<CheckInLog> CheckInLogs => Set<CheckInLog>();
    public DbSet<BookingCancellation> BookingCancellations => Set<BookingCancellation>();

    // Payment
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    // Matching
    public DbSet<MatchRoom> MatchRooms => Set<MatchRoom>();
    public DbSet<MatchMember> MatchMembers => Set<MatchMember>();
    public DbSet<MatchMemberLeaveLog> MatchMemberLeaveLogs => Set<MatchMemberLeaveLog>();

    // Notifications
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<UserDeviceToken> UserDeviceTokens => Set<UserDeviceToken>();

    // Player & System
    public DbSet<PlayerProfile> PlayerProfiles => Set<PlayerProfile>();
    public DbSet<UserFavoriteSport> UserFavoriteSports => Set<UserFavoriteSport>();
    public DbSet<ReputationHistory> ReputationHistories => Set<ReputationHistory>();
    public DbSet<SystemAuditLog> SystemAuditLogs => Set<SystemAuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SportHubDbContext).Assembly);
    }

    /// <summary>Auto-set UpdatedAt on SaveChanges</summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
