using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Infrastructure.Persistence.Configurations;

public class TournamentMatchSetConfiguration : IEntityTypeConfiguration<TournamentMatchSet>
{
    public void Configure(EntityTypeBuilder<TournamentMatchSet> builder)
    {
        builder.HasKey(s => new { s.MatchId, s.SetNumber });
        builder.HasOne(s => s.Match).WithMany(m => m.Sets).HasForeignKey(s => s.MatchId).OnDelete(DeleteBehavior.Cascade);
    }
}
