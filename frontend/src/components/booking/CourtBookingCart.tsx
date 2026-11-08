import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3, ShoppingCart, Trash2, X } from 'lucide-react';
import type { SlotAvailability } from '../../api/bookingApi';
import Button from '../ui/Button';
import './CourtBookingCart.css';

interface CourtBookingCartProps {
  courtName: string | null;
  playDate: string;
  slots: SlotAvailability[];
  totalAmount: number;
  selectionIsContiguous: boolean;
  allSlotsAvailable: boolean;
  holding: boolean;
  onRemove: (timeSlotId: number) => void;
  onHold: () => void;
}

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
};

export default function CourtBookingCart({
  courtName,
  playDate,
  slots,
  totalAmount,
  selectionIsContiguous,
  allSlotsAvailable,
  holding,
  onRemove,
  onHold,
}: CourtBookingCartProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const count = slots.length;
  const canHold = count > 0 && selectionIsContiguous && allSlotsAvailable && !holding;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!mobileOpen && dialog.open) {
      dialog.close();
    }
  }, [mobileOpen]);

  const content = (
    <>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{courtName ?? 'Chưa chọn sân'}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays size={14} aria-hidden="true" /> {formatDate(playDate)}
        </p>
      </div>

      {count === 0 ? (
        <div className="rounded-control bg-surface px-4 py-8 text-center">
          <ShoppingCart size={22} aria-hidden="true" className="mx-auto mb-2 text-muted" />
          <p className="text-sm font-medium text-foreground">Giỏ hàng đang trống</p>
          <p className="mt-1 text-xs text-muted">Chọn một hoặc nhiều giờ liên tiếp trên cùng sân.</p>
        </div>
      ) : (
        <ol className="max-h-72 space-y-2 overflow-y-auto" aria-label="Các khung giờ đã chọn">
          {slots.map((slot) => (
            <li key={slot.timeSlotId} className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock3 size={14} aria-hidden="true" />
                  {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                  {slot.isPeakHour && <span className="rounded-pill bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Peak</span>}
                </p>
                <p className="mt-1 text-xs text-muted">{slot.price.toLocaleString('vi-VN')} đ</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(slot.timeSlotId)}
                aria-label={`Bỏ chọn ${slot.startTime.slice(0, 5)} đến ${slot.endTime.slice(0, 5)}`}
                className="rounded-control p-2 text-muted hover:bg-error/5 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {count > 0 && !selectionIsContiguous && (
        <p role="alert" className="rounded-control bg-warning/10 p-3 text-xs text-warning">
          Một lượt giữ sân phải gồm các giờ liên tiếp. Chọn lại khung giờ bị bỏ trống hoặc xóa một phía của dải giờ.
        </p>
      )}
      {count > 0 && !allSlotsAvailable && (
        <p role="alert" className="rounded-control bg-error/5 p-3 text-xs text-error">
          Có khung giờ vừa hết trống. Hãy bỏ chọn giờ đó trước khi tiếp tục.
        </p>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Tạm tính · {count} giờ</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{totalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Giá giờ cao điểm đã lấy từ bảng giá hiện hành. Ưu đãi theo hạng thành viên chưa được cấu hình.
        </p>
        <Button
          type="button"
          className="mt-4 w-full"
          loading={holding}
          disabled={!canHold}
          onClick={() => {
            setMobileOpen(false);
            onHold();
          }}
        >
          {holding ? 'Đang giữ chỗ...' : 'Giữ sân 10 phút'}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside aria-label="Giỏ hàng đặt sân" className="sticky top-24 hidden h-fit space-y-4 rounded-card border border-border bg-surface-raised p-4 lg:block">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Giỏ hàng</h2>
          <span className="rounded-pill bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{count} giờ</span>
        </div>
        {content}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-overlay border-t border-border bg-surface-raised p-3 shadow-design-lg lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control bg-primary px-4 py-2 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingCart size={18} aria-hidden="true" />
            Giỏ hàng · {count} giờ
          </span>
          <span className="font-bold tabular-nums">{totalAmount.toLocaleString('vi-VN')} đ</span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="mobile-booking-cart-title"
        onCancel={(event) => {
          event.preventDefault();
          setMobileOpen(false);
        }}
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false);
        }}
        className="booking-cart-drawer m-0 fixed inset-x-0 bottom-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-dialog border border-border bg-surface-raised p-4 text-foreground shadow-design-lg backdrop:bg-slate-950/50"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="mobile-booking-cart-title" className="text-lg font-semibold">Giỏ hàng · {count} giờ</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng giỏ hàng"
            className="rounded-control p-2 text-muted hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4">{content}</div>
      </dialog>
    </>
  );
}
