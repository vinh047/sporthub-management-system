using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Infrastructure.Persistence.Configurations;

public class TournamentBracketConfiguration : IEntityTypeConfiguration<Tournament>
{
    public void Configure(EntityTypeBuilder<Tournament> builder)
        => builder.Property(t => t.BracketVersion).IsConcurrencyToken();
}
