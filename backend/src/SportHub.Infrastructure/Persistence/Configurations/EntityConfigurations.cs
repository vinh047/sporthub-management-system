using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Matching;

namespace SportHub.Infrastructure.Persistence.Configurations;

// ===== USER =====
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasIndex(u => u.PhoneNumber).IsUnique();
        builder.Property(u => u.FullName).HasMaxLength(100).IsRequired();
        builder.Property(u => u.PhoneNumber).HasMaxLength(15).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
    }
}

// ===== USER ROLE (many-to-many) =====
public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        builder.HasKey(ur => new { ur.UserId, ur.RoleId });
    }
}

// ===== ROLE PERMISSION =====
public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.HasKey(rp => new { rp.RoleId, rp.PermissionId });
    }
}

// ===== STAFF PROFILE =====
public class StaffProfileConfiguration : IEntityTypeConfiguration<StaffProfile>
{
    public void Configure(EntityTypeBuilder<StaffProfile> builder)
    {
        builder.HasKey(s => s.UserId);
        builder.HasOne(s => s.User).WithOne(u => u.StaffProfile)
            .HasForeignKey<StaffProfile>(s => s.UserId);
    }
}

// ===== FACILITY =====
public class FacilityConfiguration : IEntityTypeConfiguration<Domain.Entities.Facility.Facility>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Facility.Facility> builder)
    {
        builder.Property(f => f.Name).HasMaxLength(150).IsRequired();
        builder.Property(f => f.Address).HasMaxLength(255).IsRequired();
        builder.Property(f => f.Hotline).HasMaxLength(15).IsRequired();
    }
}

// ===== COURT =====
public class CourtConfiguration : IEntityTypeConfiguration<Court>
{
    public void Configure(EntityTypeBuilder<Court> builder)
    {
        builder.Property(c => c.CourtName).HasMaxLength(50).IsRequired();
        builder.Property(c => c.CourtType).HasConversion<string>();
    }
}

// ===== PRICE POLICY =====
public class PricePolicyConfiguration : IEntityTypeConfiguration<PricePolicy>
{
    public void Configure(EntityTypeBuilder<PricePolicy> builder)
    {
        builder.Property(p => p.BasePrice).HasPrecision(18, 2);
        builder.Property(p => p.WeekendSurchargePercent).HasPrecision(5, 2);
    }
}

// ===== BOOKING =====
public class BookingConfiguration : IEntityTypeConfiguration<Domain.Entities.Booking.Booking>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Booking.Booking> builder)
    {
        builder.HasIndex(b => b.BookingCode).IsUnique();
        builder.Property(b => b.BookingCode).HasMaxLength(20).IsRequired();
        builder.Property(b => b.TotalAmount).HasPrecision(18, 2);
        builder.Property(b => b.BookingStatus).HasConversion<string>();

        // Self-referencing FK: CreatedByStaff
        builder.HasOne(b => b.CreatedByStaff)
            .WithMany()
            .HasForeignKey(b => b.CreatedByStaffId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

// ===== MATCH ROOM =====
public class MatchRoomConfiguration : IEntityTypeConfiguration<MatchRoom>
{
    public void Configure(EntityTypeBuilder<MatchRoom> builder)
    {
        builder.HasIndex(m => m.BookingDetailId).IsUnique(); // 1 BookingDetail - 1 MatchRoom
        builder.Property(m => m.RoomStatus).HasConversion<string>();
        builder.Property(m => m.TargetSkillLevel).HasConversion<string>();
        builder.Property(m => m.ShareFeeEstimate).HasPrecision(18, 2);

        builder.HasOne(m => m.Host)
            .WithMany()
            .HasForeignKey(m => m.HostUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

// ===== USER FAVORITE SPORT =====
public class UserFavoriteSportConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Player.UserFavoriteSport>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Player.UserFavoriteSport> builder)
    {
        builder.HasKey(u => new { u.UserId, u.SportId });
        builder.Property(u => u.SelfAssessmentRank).HasConversion<string>();
    }
}

// ===== PLAYER PROFILE =====
public class PlayerProfileConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Player.PlayerProfile>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Player.PlayerProfile> builder)
    {
        builder.HasKey(p => p.UserId);
        builder.HasOne(p => p.User).WithOne(u => u.PlayerProfile)
            .HasForeignKey<SportHub.Domain.Entities.Player.PlayerProfile>(p => p.UserId);
        builder.Property(p => p.SkillLevel).HasConversion<string>();
    }
}
