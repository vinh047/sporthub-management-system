using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Configurations;

public class BookingCancellationPaymentConfiguration : IEntityTypeConfiguration<BookingCancellation>
{
    public void Configure(EntityTypeBuilder<BookingCancellation> builder)
    {
        builder.Property(cancellation => cancellation.RefundStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(RefundStatus.NotRequired);
        builder.Property(cancellation => cancellation.RefundFailureReason).HasMaxLength(500);
    }
}
