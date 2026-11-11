import type { ButtonHTMLAttributes } from 'react';

export type BookingSlotStatus =
  | 'Available'
  | 'Selected'
  | 'Held'
  | 'Confirmed'
  | 'Social'
  | 'Maintenance'
  | 'Disabled';

interface BookingSlotProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  status: BookingSlotStatus;
  time: string;
  price?: number;
  onSelect?: () => void;
}

const statusInfo: Record<BookingSlotStatus, { label: string; classes: string; selectable: boolean }> = {
  Available: { label: 'Còn trống', classes: 'border-success/30 bg-success/10 text-success hover:bg-success/20', selectable: true },
  Selected: { label: 'Đang chọn', classes: 'border-primary bg-primary text-white', selectable: true },
  Held: { label: 'Đang giữ chỗ', classes: 'border-warning/30 bg-warning/10 text-warning', selectable: false },
  Confirmed: { label: 'Đã đặt', classes: 'border-error/30 bg-error/10 text-error', selectable: false },
  Social: { label: 'Sự kiện Social', classes: 'border-secondary/30 bg-secondary/10 text-secondary', selectable: false },
  Maintenance: { label: 'Bảo trì', classes: 'border-border bg-slate-100 text-muted', selectable: false },
  Disabled: { label: 'Không khả dụng', classes: 'border-border bg-surface text-muted', selectable: false },
};

export default function BookingSlot({ status, time, price, onSelect, ...props }: BookingSlotProps) {
  const info = statusInfo[status];
  const selectable = info.selectable && !props.disabled;
  const priceLabel = price === undefined ? '' : `, ${price.toLocaleString('vi-VN')} đồng`;

  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      disabled={!selectable}
      aria-pressed={status === 'Selected'}
      aria-label={`${time}: ${info.label}${priceLabel}`}
      title={`${time} · ${info.label}`}
      onClick={selectable ? onSelect : undefined}
      className={`min-h-12 min-w-20 rounded-control border px-2 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed ${info.classes} ${props.className ?? ''}`}
    >
      <span className="block">{time}</span>
      {price !== undefined && <span className="mt-0.5 block font-normal">{price.toLocaleString('vi-VN')} đ</span>}
      {!['Available', 'Selected'].includes(status) && <span className="mt-0.5 block text-[10px] font-medium">{info.label}</span>}
    </button>
  );
}
