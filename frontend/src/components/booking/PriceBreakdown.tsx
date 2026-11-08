interface PriceBreakdownProps {
  basePrice: number;
  totalPrice: number;
  isPeakHour?: boolean;
  discountAmount?: number;
  currencyLabel?: string;
}

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

export default function PriceBreakdown({
  basePrice,
  totalPrice,
  isPeakHour = false,
  discountAmount = 0,
  currencyLabel,
}: PriceBreakdownProps) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted">{isPeakHour ? 'Giá giờ cao điểm' : 'Giá giờ thường'}</dt>
        <dd className="font-medium text-foreground">{formatCurrency(basePrice)}</dd>
      </div>
      {discountAmount > 0 && (
        <div className="flex items-center justify-between gap-4 text-success">
          <dt>Ưu đãi</dt>
          <dd className="font-medium">−{formatCurrency(discountAmount)}</dd>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
        <dt className="font-semibold text-foreground">{currencyLabel ?? 'Tổng cộng'}</dt>
        <dd className="font-bold text-foreground">{formatCurrency(totalPrice)}</dd>
      </div>
    </dl>
  );
}
