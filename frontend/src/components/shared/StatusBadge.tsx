import Badge from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';

export type BookingStatus = 'Held' | 'Confirmed' | 'Cancelled' | 'Completed' | 'NoShow';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Failed' | 'Refunded';

const bookingStatusInfo: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
  Held: { label: 'Chờ thanh toán', variant: 'warning' },
  Confirmed: { label: 'Đã xác nhận', variant: 'success' },
  Cancelled: { label: 'Đã hủy', variant: 'neutral' },
  Completed: { label: 'Hoàn thành', variant: 'info' },
  NoShow: { label: 'Không đến', variant: 'error' },
};

const paymentStatusInfo: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  Unpaid: { label: 'Chưa thanh toán', variant: 'warning' },
  Paid: { label: 'Đã thanh toán', variant: 'success' },
  Failed: { label: 'Thanh toán thất bại', variant: 'error' },
  Refunded: { label: 'Đã hoàn tiền', variant: 'info' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = bookingStatusInfo[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant } = paymentStatusInfo[status];
  return <Badge variant={variant}>{label}</Badge>;
}
