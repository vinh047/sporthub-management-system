import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ban,
  Clock,
  Edit3,
  ExternalLink,
  LogIn,
  LogOut,
  RotateCcw,
  UserX,
} from 'lucide-react';
import { checkInApi } from '../api/checkInApi';
import type {
  CheckInChannel,
  ReceptionBookingDetail,
  ReceptionBookingSlot,
} from '../api/checkInApi';
import { getErrorMessage } from '../api/errors';
import { Badge, Button, Dialog, Input, Select } from './ui';
import { LoadingState } from './shared';

interface ReceptionOrderModalProps {
  bookingId?: number | null;
  defaultChannel?: CheckInChannel;
  standalone?: boolean;
  onClose?: () => void;
  onUpdated?: () => void;
}

const hhmm = (t: string) => t.slice(0, 5);
const fmtVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const toDateTime = (iso: string | null) =>
  iso
    ? new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const STATUS_LABEL: Record<string, string> = {
  Held: 'Đang giữ chỗ (Chờ thu tiền)',
  Confirmed: 'Đã xác nhận',
  Completed: 'Đã Check-out (Hoàn tất)',
  NoShow: 'Vắng mặt (No-Show)',
  Cancelled: 'Đã hủy',
};

export default function ReceptionOrderModal({
  bookingId: propBookingId,
  defaultChannel = 'Manual',
  standalone = false,
  onClose,
  onUpdated,
}: ReceptionOrderModalProps) {
  const params = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();
  const resolvedId = propBookingId ?? (params.bookingId ? Number(params.bookingId) : null);

  const [order, setOrder] = useState<ReceptionBookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [confirmMode, setConfirmMode] = useState<'none' | 'cancel' | 'noshow'>('none');
  const [reason, setReason] = useState('');

  const handleClose = () => {
    if (onClose) onClose();
    else if (window.opener) window.close();
    else navigate(-1);
  };

  useEffect(() => {
    if (!resolvedId) {
      setOrder(null);
      return;
    }
    let active = true;
    setLoading(true);
    setConfirmMode('none');
    setEditingCustomer(false);

    checkInApi
      .getBookingOrder(resolvedId)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setGuestName(data.customerName);
        setGuestPhone(data.customerPhone ?? '');
      })
      .catch((err) => {
        if (active) {
          toast.error(getErrorMessage(err));
          handleClose();
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [resolvedId]);

  if (!resolvedId) return null;

  const sync = (updated: ReceptionBookingDetail, msg?: string) => {
    setOrder(updated);
    setGuestName(updated.customerName);
    setGuestPhone(updated.customerPhone ?? '');
    if (msg) toast.success(msg);
    onUpdated?.();
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSlotCheckIn = (slot: ReceptionBookingSlot) =>
    runAction(`in-${slot.bookingDetailId}`, async () => {
      await checkInApi.checkIn(slot.bookingDetailId, defaultChannel);
      sync(await checkInApi.getBookingOrder(resolvedId), `Đã Check-in ${slot.courtName}`);
    });

  const handleUndoSlot = (slot: ReceptionBookingSlot) =>
    runAction(`undo-${slot.bookingDetailId}`, async () => {
      sync(await checkInApi.undoSlotCheckIn(slot.bookingDetailId), 'Đã hoàn tác Check-in');
    });

  const isTerminal =
    order?.bookingStatus === 'Completed' ||
    order?.bookingStatus === 'Cancelled' ||
    order?.bookingStatus === 'NoShow';

  const canCheckInAll =
    order && order.bookingStatus === 'Confirmed' && order.checkedInSlots < order.totalSlots;

  const openInNewWindow = () => {
    window.open(
      `/admin/reception/orders/${resolvedId}`,
      `order_${resolvedId}`,
      'width=960,height=780,noopener,noreferrer',
    );
  };

  const innerContent = loading || !order ? (
    <LoadingState label="Đang tải thông tin đơn đặt sân…" />
  ) : (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">#{order.bookingCode}</Badge>
          <Badge variant={order.bookingStatus === 'Completed' ? 'primary' : 'neutral'}>
            {STATUS_LABEL[order.bookingStatus] ?? order.bookingStatus}
          </Badge>
          <span className="text-xs text-muted">· {order.facilityName}</span>
        </div>
        {!standalone && (
          <Button type="button" variant="outline" size="sm" onClick={openInNewWindow}>
            <ExternalLink size={14} /> Mở cửa sổ mới
          </Button>
        )}
      </div>

      {/* 1. Khách hàng & Điểm thành viên */}
      <section className="rounded-card border border-border bg-surface-raised p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Khách nhận sân</h3>
            <Badge variant="neutral">
              {order.customerType === 'Member' ? 'Thành viên' : 'Khách vãng lai'}
            </Badge>
          </div>
          {!isTerminal && !editingCustomer && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCustomer(true)}>
              <Edit3 size={13} /> Sửa tên / SĐT
            </Button>
          )}
        </div>

        {editingCustomer ? (
          <div className="grid gap-2 sm:grid-cols-3 items-end">
            <Input
              label="Tên khách"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <Input
              label="Số điện thoại"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                loading={busy === 'save-cust'}
                onClick={() =>
                  runAction('save-cust', async () => {
                    const u = await checkInApi.updateCustomerInfo(resolvedId, {
                      guestName: guestName.trim(),
                      guestPhone: guestPhone.trim(),
                    });
                    setEditingCustomer(false);
                    sync(u, 'Đã cập nhật thông tin khách');
                  })
                }
              >
                Lưu
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCustomer(false)}>
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-control border border-border bg-surface p-3">
              <span className="text-muted">Họ tên</span>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{order.customerName}</p>
            </div>
            <div className="rounded-control border border-border bg-surface p-3">
              <span className="text-muted">Số điện thoại</span>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{order.customerPhone ?? '—'}</p>
            </div>
            <div className="rounded-control border border-border bg-surface p-3">
              <span className="text-muted">Tạo lúc</span>
              <p className="mt-0.5 font-semibold text-foreground">{toDateTime(order.createdAt)}</p>
            </div>
          </div>
        )}

        {order.playerProfile && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-muted">Hạng thành viên</span>
              <p className="font-semibold text-primary">{order.playerProfile.currentTier}</p>
            </div>
            <div>
              <span className="text-muted">Điểm tích lũy</span>
              <p className="font-semibold text-foreground">
                {order.playerProfile.loyaltyPoints.toLocaleString('vi-VN')} điểm
                {order.loyaltyPointsEarned > 0 && (
                  <span className="ml-1 text-primary">(+{order.loyaltyPointsEarned})</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted">Điểm uy tín</span>
              <p className="font-semibold text-foreground">{order.playerProfile.reputationScore}/100</p>
            </div>
            <div>
              <span className="text-muted">Số trận / No-Show</span>
              <p className="font-semibold text-foreground">
                {order.playerProfile.totalMatchesPlayed} trận · {order.playerProfile.totalNoShows} vắng
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. Danh sách Ca sân & Check-in */}
      <section className="rounded-card border border-border bg-surface-raised p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Khung giờ sân ({order.checkedInSlots}/{order.totalSlots} đã Check-in)
          </h3>
          {canCheckInAll && (
            <Button
              type="button"
              size="sm"
              loading={busy === 'in-all'}
              onClick={() =>
                runAction('in-all', async () => {
                  sync(
                    await checkInApi.checkInAllSlots(resolvedId, defaultChannel),
                    'Đã Check-in toàn bộ ca sân!',
                  );
                })
              }
            >
              <LogIn size={14} /> Check-in tất cả
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface text-left uppercase text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Sân</th>
                <th className="px-3 py-2.5 font-semibold">Ngày & Giờ</th>
                <th className="px-3 py-2.5 font-semibold text-right">Giá</th>
                <th className="px-3 py-2.5 font-semibold">Trạng thái</th>
                <th className="px-3 py-2.5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {order.slots.map((slot) => (
                <tr key={slot.bookingDetailId} className="border-t border-border">
                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    {slot.courtName} <span className="text-muted">({slot.sportName})</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-primary">
                      <Clock size={12} className="inline mr-1" />
                      {hhmm(slot.startTime)}–{hhmm(slot.endTime)}
                    </span>{' '}
                    <span className="text-muted">{slot.playDate}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                    {fmtVnd(slot.slotPrice)}
                  </td>
                  <td className="px-3 py-2.5">
                    {slot.checkedIn ? (
                      <span className="font-semibold text-foreground">
                        Đã vào lúc {toDateTime(slot.checkInAt)}
                      </span>
                    ) : (
                      <span className="text-muted">Chưa nhận sân</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {!slot.checkedIn && order.bookingStatus === 'Confirmed' && (
                      <Button
                        type="button"
                        size="sm"
                        loading={busy === `in-${slot.bookingDetailId}`}
                        onClick={() => handleSlotCheckIn(slot)}
                      >
                        Check-in
                      </Button>
                    )}
                    {slot.checkedIn && order.bookingStatus !== 'Completed' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={busy === `undo-${slot.bookingDetailId}`}
                        onClick={() => handleUndoSlot(slot)}
                      >
                        <RotateCcw size={12} /> Hoàn tác
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Thanh toán */}
      <section className="rounded-card border border-border bg-surface-raised p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Thanh toán</h3>
          <Badge variant={order.remainingAmount === 0 ? 'primary' : 'neutral'}>
            {order.remainingAmount === 0
              ? 'Đã thu đủ'
              : `Cần thu thêm: ${fmtVnd(order.remainingAmount)}`}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-control border border-border bg-surface p-3">
            <span className="text-muted">Tổng tiền đơn</span>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{fmtVnd(order.finalAmount)}</p>
          </div>
          <div className="rounded-control border border-border bg-surface p-3">
            <span className="text-muted">Đã thanh toán</span>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{fmtVnd(order.paidAmount)}</p>
          </div>
          <div className="rounded-control border border-border bg-surface p-3">
            <span className="text-muted">Còn lại</span>
            <p className="mt-0.5 text-sm font-semibold text-primary">{fmtVnd(order.remainingAmount)}</p>
          </div>
        </div>

        {!isTerminal && order.remainingAmount > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-control border border-border bg-surface p-3">
            <Select
              label="Phương thức thu tại quầy"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(Number(e.target.value))}
            >
              <option value={1}>Tiền mặt tại quầy</option>
              <option value={2}>Chuyển khoản VietQR</option>
            </Select>
            <Button
              type="button"
              size="sm"
              loading={busy === 'pay'}
              onClick={() =>
                runAction('pay', async () => {
                  sync(
                    await checkInApi.collectPayment(resolvedId, { paymentMethodId }),
                    'Đã thu tiền và xác nhận đơn!',
                  );
                })
              }
            >
              Xác nhận thu {fmtVnd(order.remainingAmount)}
            </Button>
          </div>
        )}
      </section>

      {/* Form xác nhận Hủy / No-Show */}
      {confirmMode !== 'none' && (
        <section className="rounded-card border border-border bg-surface p-4 space-y-3">
          <Input
            label={
              confirmMode === 'cancel'
                ? 'Lý do hủy đơn tại quầy *'
                : 'Xác nhận khách vắng mặt (No-Show) – trừ 10 điểm uy tín & mở lại sân'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={confirmMode === 'cancel' ? 'Nhập lý do hủy...' : 'Ghi chú (tùy chọn)...'}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmMode('none');
                setReason('');
              }}
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              loading={busy === 'confirm-act'}
              onClick={() =>
                runAction('confirm-act', async () => {
                  if (confirmMode === 'cancel') {
                    if (reason.trim().length < 3) {
                      toast.error('Nhập lý do hủy tối thiểu 3 ký tự');
                      return;
                    }
                    sync(await checkInApi.cancelAtCounter(resolvedId, reason.trim()), 'Đã hủy đơn');
                  } else {
                    sync(
                      await checkInApi.markNoShow(resolvedId, reason.trim() || undefined),
                      'Đã đánh dấu No-Show',
                    );
                  }
                  setConfirmMode('none');
                  setReason('');
                })
              }
            >
              Xác nhận
            </Button>
          </div>
        </section>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          {!isTerminal && order.checkedInSlots === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmMode('noshow')}>
              <UserX size={14} /> Báo No-Show
            </Button>
          )}
          {!isTerminal && (
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmMode('cancel')}>
              <Ban size={14} /> Hủy đơn
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isTerminal && (
            <Button
              type="button"
              loading={busy === 'checkout'}
              onClick={() =>
                runAction('checkout', async () => {
                  const u = await checkInApi.checkoutBooking(resolvedId, { paymentMethodId });
                  sync(u, 'Đã Check-out trả sân & hoàn tất đơn!');
                })
              }
            >
              <LogOut size={15} />
              {order.remainingAmount > 0
                ? `Thu ${fmtVnd(order.remainingAmount)} & Check-out`
                : 'Check-out / Hoàn tất trả sân'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center justify-between rounded-card border border-border bg-surface-raised p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">SportHub Reception</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Quản lý đơn đặt sân & Check-out</h1>
          </div>
          <Button variant="outline" onClick={handleClose}>Đóng</Button>
        </header>
        {innerContent}
      </div>
    );
  }

  return (
    <Dialog
      open={Boolean(resolvedId)}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={order ? `Quản lý đơn #${order.bookingCode}` : 'Quản lý đơn đặt sân'}
      description={order ? `${order.facilityName} · ${order.customerName}` : undefined}
      size="lg"
    >
      {innerContent}
    </Dialog>
  );
}
