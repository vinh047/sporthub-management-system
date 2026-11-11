using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Infrastructure.Persistence.Configurations;

public class TournamentMatchBracketConfiguration : IEntityTypeConfiguration<TournamentMatch>
{
    public void Configure(EntityTypeBuilder<TournamentMatch> builder)
        => builder.HasIndex(m => new { m.TournamentId, m.RoundNumber, m.MatchOrder }).IsUnique();
}
