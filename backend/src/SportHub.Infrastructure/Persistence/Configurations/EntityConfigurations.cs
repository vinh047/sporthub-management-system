using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Auth;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Booking;

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

// ===== PLAYER PROFILE =====
public class PlayerProfileConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Player.PlayerProfile>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Player.PlayerProfile> builder)
    {
        builder.HasKey(p => p.UserId);
        builder.HasOne(p => p.User).WithOne(u => u.PlayerProfile)
            .HasForeignKey<SportHub.Domain.Entities.Player.PlayerProfile>(p => p.UserId);
        builder.Property(p => p.NumericSkillRating).HasPrecision(4, 2);
        builder.Property(p => p.SkillLevel).HasMaxLength(20);
        builder.Property(p => p.CurrentTier).HasMaxLength(20);
    }
}

// ===== SOCIAL & TOURNAMENT FK RESTRICTIONS =====
public class SocialSessionConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Social.SocialSession>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Social.SocialSession> builder)
    {
        builder.HasOne(s => s.CreatedByStaff).WithMany().HasForeignKey(s => s.CreatedByStaffId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(s => s.FeePerSlot).HasPrecision(18, 2);
        builder.Property(s => s.MinSkill).HasPrecision(4, 2);
        builder.Property(s => s.MaxSkill).HasPrecision(4, 2);
    }
}

public class SocialParticipantConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Social.SocialParticipant>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Social.SocialParticipant> builder)
    {
        builder.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(p => p.Session).WithMany(s => s.Participants).HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(p => p.PaidAmount).HasPrecision(18, 2);
    }
}

public class SocialSessionCourtConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Social.SocialSessionCourt>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Social.SocialSessionCourt> builder)
    {
        builder.HasOne(c => c.Session).WithMany(s => s.SessionCourts).HasForeignKey(c => c.SessionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(c => c.Court).WithMany().HasForeignKey(c => c.CourtId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TournamentConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Tournament.Tournament>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Tournament.Tournament> builder)
    {
        builder.HasOne(t => t.CreatedByStaff).WithMany().HasForeignKey(t => t.CreatedByStaffId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(t => t.Facility).WithMany().HasForeignKey(t => t.FacilityId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(t => t.EntryFee).HasPrecision(18, 2);
    }
}

public class TournamentTeamConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Tournament.TournamentTeam>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Tournament.TournamentTeam> builder)
    {
        builder.HasOne(t => t.Tournament).WithMany(t => t.Teams).HasForeignKey(t => t.TournamentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TournamentAthleteConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Tournament.TournamentAthlete>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Tournament.TournamentAthlete> builder)
    {
        builder.HasOne(a => a.Team).WithMany(t => t.Athletes).HasForeignKey(a => a.TeamId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TournamentMatchConfiguration : IEntityTypeConfiguration<SportHub.Domain.Entities.Tournament.TournamentMatch>
{
    public void Configure(EntityTypeBuilder<SportHub.Domain.Entities.Tournament.TournamentMatch> builder)
    {
        builder.HasOne(m => m.Tournament).WithMany(t => t.Matches).HasForeignKey(m => m.TournamentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(m => m.Court).WithMany().HasForeignKey(m => m.CourtId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(m => m.Team1).WithMany().HasForeignKey(m => m.Team1Id).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(m => m.Team2).WithMany().HasForeignKey(m => m.Team2Id).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(m => m.WinnerTeam).WithMany().HasForeignKey(m => m.WinnerTeamId).OnDelete(DeleteBehavior.Restrict);
    }
}
