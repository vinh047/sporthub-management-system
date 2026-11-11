import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, LoaderCircle, MapPin, X } from 'lucide-react';
import { bookingApi } from '../../api/bookingApi';
import type { Booking } from '../../api/bookingApi';
import { getErrorMessage } from '../../api/errors';

const statusLabels: Record<string, { label: string; className: string }> = {
  Held: { label: 'Chờ thanh toán', className: 'bg-yellow-100 text-yellow-900' },
  Confirmed: { label: 'Đã xác nhận', className: 'bg-green-100 text-green-900' },
  Cancelled: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-700' },
  Completed: { label: 'Đã hoàn thành', className: 'bg-blue-100 text-blue-900' },
  NoShow: { label: 'Không đến', className: 'bg-red-100 text-red-900' },
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await bookingApi.getMyBookings());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBookings(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBookings]);

  useEffect(() => {
    const paymentResult = searchParams.get('paymentResult');
    if (!paymentResult) return;

    if (paymentResult === 'processing') {
      toast('VNPay đã báo giao dịch thành công. Hệ thống đang chờ IPN xác nhận đơn.', { icon: '⏳' });
    } else if (paymentResult === 'failed') {
      toast.error('VNPay không xác nhận giao dịch thành công.');
    } else {
      toast.error('Không thể xác thực kết quả trả về từ VNPay.');
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('paymentResult');
    nextSearchParams.delete('bookingId');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const cancelBooking = async () => {
    if (!bookingToCancel || cancelling) return;
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      const result = await bookingApi.cancel(bookingToCancel.id, cancelReason.trim());
      setBookingToCancel(null);
      setCancelReason('');
      if (result.refundStatus === 'Failed' || result.refundStatus === 'ManualRequired') {
        toast.error(result.refundNote ?? 'Đơn đã hủy nhưng cần hỗ trợ xử lý khoản hoàn.');
      } else {
        toast.success(result.refundNote ?? 'Đã hủy đơn đặt sân.');
      }
      await loadBookings();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Đơn đặt sân của tôi</h1>
        <p className="mt-1 text-sm text-gray-500">Theo dõi trạng thái, thời gian chơi và hủy đơn theo chính sách hoàn tiền.</p>
      </header>
      {loading ? (
        <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-red-700" /></div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <CalendarDays className="mx-auto mb-3" />
          Bạn chưa có đơn đặt sân nào.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-gray-500">{booking.bookingCode}</p>
                  <h2 className="mt-1 text-lg font-bold">
                    {booking.details.map((detail) => detail.courtName).filter((name, index, names) => names.indexOf(name) === index).join(', ')}
                  </h2>
                  {booking.details.map((detail) => (
                    <p key={detail.id} className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-600">
                      <MapPin size={14} /> {detail.facilityName} · {formatDate(detail.playDate)} · {detail.startTime.slice(0, 5)}–{detail.endTime.slice(0, 5)}
                    </p>
                  ))}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusLabels[booking.status]?.className ?? 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[booking.status]?.label ?? booking.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="font-bold">{booking.totalAmount.toLocaleString('vi-VN')} đ</p>
                {(booking.status === 'Held' || booking.status === 'Confirmed') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookingToCancel(booking);
                      setCancelReason('');
                      setCancelError(null);
                    }}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Hủy đơn
                  </button>
                )}
              </div>
              {booking.paymentStatus === 'Pending' && booking.status === 'Held' && (
                <p className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                  Đang chờ VNPay xác nhận. Nếu giao dịch thành công mà trạng thái chưa đổi, hãy tải lại sau ít phút.
                </p>
              )}
              {booking.refundStatus && booking.refundStatus !== 'NotRequired' && (
                <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                  booking.refundStatus === 'Processing'
                    ? 'bg-blue-50 text-blue-900'
                    : booking.refundStatus === 'Failed' || booking.refundStatus === 'ManualRequired'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-yellow-50 text-yellow-900'
                }`}>
                  {booking.refundStatus === 'Processing'
                    ? `Yêu cầu hoàn ${booking.refundAmount?.toLocaleString('vi-VN') ?? '0'} đ đang xử lý. Dự kiến nhận tiền sau 1–3 ngày làm việc.`
                    : booking.refundStatus === 'Pending'
                      ? 'Yêu cầu hoàn tiền đang chờ xử lý.'
                      : booking.refundStatus === 'Failed'
                        ? 'Yêu cầu hoàn tiền chưa thành công. Vui lòng liên hệ bộ phận hỗ trợ.'
                        : booking.refundStatus === 'ManualRequired'
                          ? 'Khoản hoàn cần nhân viên xác nhận và xử lý thủ công.'
                          : 'Khoản tiền đã được hoàn.'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cancel-booking-title" className="text-xl font-bold">Hủy đơn đặt sân</h2>
                <p className="mt-1 text-sm text-gray-500">{bookingToCancel.bookingCode}</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={cancelling} onClick={() => setBookingToCancel(null)}>
                <X size={20} />
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Lý do hủy</span>
              <textarea
                autoFocus
                rows={3}
                maxLength={500}
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  setCancelError(null);
                }}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5"
                placeholder="Cho chúng tôi biết lý do bạn muốn hủy..."
              />
            </label>
            {cancelError && <p role="alert" className="text-sm text-red-700">{cancelError}</p>}
            <p className="text-xs text-gray-500">
              Mức hoàn tiền (nếu có) được tính theo thời điểm hủy. Với giao dịch VNPay, thời gian nhận tiền dự kiến là 1–3 ngày làm việc sau khi yêu cầu hoàn được chấp nhận.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={cancelling} onClick={() => setBookingToCancel(null)} className="rounded-xl border px-4 py-2 disabled:opacity-60">Quay lại</button>
              <button type="button" disabled={cancelling} onClick={() => void cancelBooking()} className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
