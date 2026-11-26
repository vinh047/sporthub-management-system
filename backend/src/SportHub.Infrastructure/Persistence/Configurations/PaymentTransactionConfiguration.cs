using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Configurations;

public class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.Property(transaction => transaction.TransactionType)
            .HasConversion<string>()
            .HasMaxLength(10)
            .HasDefaultValue(PaymentTransactionType.Payment);
        builder.Property(transaction => transaction.ProviderTransactionId).HasMaxLength(100);
        builder.Property(transaction => transaction.PaymentUrl).HasMaxLength(2048);
        builder.HasIndex(transaction => transaction.RelatedTransactionId)
            .IsUnique()
            .HasFilter("[RelatedTransactionId] IS NOT NULL");
        builder.HasOne(transaction => transaction.RelatedTransaction)
            .WithMany(transaction => transaction.RelatedTransactions)
            .HasForeignKey(transaction => transaction.RelatedTransactionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
