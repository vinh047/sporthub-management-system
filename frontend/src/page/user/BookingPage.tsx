import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, LoaderCircle, MapPin, Trophy } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { bookingApi, bookingCatalog } from '../../api/bookingApi';
import type { Booking, CourtAvailability, SlotAvailability } from '../../api/bookingApi';
import { getErrorMessage } from '../../api/errors';
import CourtBookingCart from '../../components/booking/CourtBookingCart';
import CourtTimeGrid from '../../components/CourtTimeGrid';
import HoldCountdownTimer from '../../components/HoldCountdownTimer';
import { useCourtStatus } from '../../hooks/useSignalR';

const getVietnamDateTime = (timestamp: number) => {
  const parts = new Map<string, string>(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp).map(({ type, value }) => [type, value]));
  const part = (name: string) => {
    const value = parts.get(name);
    if (!value) throw new Error(`Missing ${name} in Vietnam date/time formatter.`);
    return value;
  };
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}:${part('second')}`,
  };
};

const today = () => getVietnamDateTime(Date.now()).date;
const tomorrow = () => {
  const date = new Date(`${today()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const slotHasStarted = (playDate: string, slot: SlotAvailability, current: { date: string; time: string }) =>
  playDate < current.date || (playDate === current.date && slot.startTime <= current.time);
const isValidDate = (value: string | null): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return !Number.isNaN(date.getTime()) && formattedDate === value;
};

const isContiguous = (slots: SlotAvailability[]) =>
  slots.every((slot, index) => index === 0 || slots[index - 1].endTime === slot.startTime);

export default function BookingPage() {
  const { search } = useLocation();
  const filters = new URLSearchParams(search);
  const [facilityId, setFacilityId] = useState<number>(() => {
    const requestedId = Number(filters.get('facilityId'));
    return bookingCatalog.facilities.some((facility) => facility.id === requestedId)
      ? requestedId
      : bookingCatalog.facilities[0].id;
  });
  const [sportId, setSportId] = useState<number>(() => {
    const requestedId = Number(filters.get('sportId'));
    return bookingCatalog.sports.some((sport) => sport.id === requestedId)
      ? requestedId
      : bookingCatalog.sports[0].id;
  });
  const [playDate, setPlayDate] = useState(() => {
    const requestedDate = filters.get('date');
    return isValidDate(requestedDate) ? requestedDate : tomorrow();
  });
  const [courts, setCourts] = useState<CourtAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<number>>(() => new Set());
  const [hold, setHold] = useState<Booking | null>(null);
  const [holding, setHolding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancellingHold, setCancellingHold] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => getVietnamDateTime(Date.now()));
  const requestId = useRef(0);
  const holdingRef = useRef(false);

  const isSlotInPast = useCallback((slot: SlotAvailability) => {
    return slotHasStarted(playDate, slot, currentTime);
  }, [currentTime, playDate]);

  const loadAvailability = useCallback(async () => {
    if (facilityId <= 0 || sportId <= 0 || !playDate) return;
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setAvailabilityError(null);
    try {
      const result = await bookingApi.getAvailability(facilityId, sportId, playDate);
      if (currentRequestId === requestId.current) setCourts(result);
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setCourts([]);
        setAvailabilityError(getErrorMessage(error));
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [facilityId, sportId, playDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAvailability(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestId.current += 1;
    };
  }, [loadAvailability]);

  const handleSlotUpdate = useCallback((update: { courtId: number; timeSlotId: number; status: string }) => {
    setCourts((current) => current.map((court) => (
      court.courtId !== update.courtId
        ? court
        : {
            ...court,
            slots: court.slots.map((slot) => (
              slot.timeSlotId !== update.timeSlotId
                ? slot
                : { ...slot, status: update.status, isAvailable: update.status === 'Available' }
            )),
          }
    )));
    if (holdingRef.current) return;

    if (
      update.status !== 'Available'
      && update.courtId === selectedCourtId
      && selectedSlotIds.has(update.timeSlotId)
    ) {
      const next = new Set(selectedSlotIds);
      next.delete(update.timeSlotId);
      setSelectedSlotIds(next);
      if (next.size === 0) setSelectedCourtId(null);
      toast('Một khung giờ bạn chọn vừa được cập nhật và không còn trống; đã bỏ khỏi giỏ.', {
        id: 'selected-court-slot-unavailable',
      });
    }
  }, [selectedCourtId, selectedSlotIds]);

  useCourtStatus(facilityId, playDate, handleSlotUpdate);

  const selectedCourt = courts.find((court) => court.courtId === selectedCourtId) ?? null;
  const selectedSlots = selectedCourt
    ? selectedCourt.slots.filter((slot) => selectedSlotIds.has(slot.timeSlotId))
    : [];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const current = getVietnamDateTime(Date.now());
      setCurrentTime(current);
      if (!selectedCourt) return;

      const expiredSlotIds = selectedCourt.slots
        .filter((slot) => selectedSlotIds.has(slot.timeSlotId) && slotHasStarted(playDate, slot, current))
        .map((slot) => slot.timeSlotId);
      if (expiredSlotIds.length === 0) return;

      const remainingSlotIds = new Set(selectedSlotIds);
      expiredSlotIds.forEach((timeSlotId) => remainingSlotIds.delete(timeSlotId));
      setSelectedSlotIds(remainingSlotIds);
      if (remainingSlotIds.size === 0) setSelectedCourtId(null);
      toast('Khung giờ đã bắt đầu và được bỏ khỏi giỏ.', { id: 'selected-slot-started' });
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [playDate, selectedCourt, selectedSlotIds]);

  const selectedTotal = selectedSlots.reduce((total, slot) => total + slot.price, 0);
  const selectionIsContiguous = isContiguous(selectedSlots);
  const allSlotsAvailable = selectedSlots.length === selectedSlotIds.size
    && selectedSlots.every((slot) => slot.status === 'Available' && slot.isAvailable && !isSlotInPast(slot));

  const clearSelection = () => {
    setSelectedCourtId(null);
    setSelectedSlotIds(new Set());
  };

  const removeSelectedSlot = (timeSlotId: number) => {
    const next = new Set(selectedSlotIds);
    next.delete(timeSlotId);
    setSelectedSlotIds(next);
    if (next.size === 0) setSelectedCourtId(null);
  };

  const toggleSlot = (court: CourtAvailability, slot: SlotAvailability) => {
    if (slot.status !== 'Available' || !slot.isAvailable || slotHasStarted(playDate, slot, getVietnamDateTime(Date.now()))) return;

    if (selectedCourtId !== null && selectedCourtId !== court.courtId && selectedSlotIds.size > 0) {
      toast.error('Một lượt giữ chỗ chỉ áp dụng cho một sân. Xóa giờ đang chọn trước khi đổi sân.');
      return;
    }

    if (selectedSlotIds.has(slot.timeSlotId)) {
      const next = new Set(selectedSlotIds);
      next.delete(slot.timeSlotId);
      setSelectedSlotIds(next);
      if (next.size === 0) setSelectedCourtId(null);
      return;
    }

    const candidateIds = new Set(selectedSlotIds);
    candidateIds.add(slot.timeSlotId);
    const candidateSlots = court.slots.filter((item) => candidateIds.has(item.timeSlotId));
    if (!isContiguous(candidateSlots)) {
      toast.error('Hãy chọn các khung giờ liền nhau trên cùng một sân.');
      return;
    }

    setSelectedCourtId(court.courtId);
    setSelectedSlotIds(candidateIds);
  };

  const selectDragRange = (court: CourtAvailability, startSlotId: number, endSlotId: number) => {
    if (selectedCourtId !== null && selectedCourtId !== court.courtId && selectedSlotIds.size > 0) return;

    const startIndex = court.slots.findIndex((slot) => slot.timeSlotId === startSlotId);
    const endIndex = court.slots.findIndex((slot) => slot.timeSlotId === endSlotId);
    if (startIndex < 0 || endIndex < 0) return;

    const current = getVietnamDateTime(Date.now());
    const step = startIndex <= endIndex ? 1 : -1;
    const range: SlotAvailability[] = [];
    for (let index = startIndex; index !== endIndex + step; index += step) {
      const slot = court.slots[index];
      const previous = range.at(-1);
      const slotAvailable = slot.status === 'Available' && slot.isAvailable
        && !slotHasStarted(playDate, slot, current);
      const timeIsContinuous = !previous || (
        step > 0 ? previous.endTime === slot.startTime : slot.endTime === previous.startTime
      );
      if (!slotAvailable || !timeIsContinuous) break;
      range.push(slot);
    }

    if (range.length === 0) return;
    setSelectedCourtId(court.courtId);
    setSelectedSlotIds(new Set(range.map((slot) => slot.timeSlotId)));
  };

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    clearSelection();
    void loadAvailability();
  };

  const holdSelectedSlot = async () => {
    if (!selectedCourt || selectedSlots.length === 0 || !selectionIsContiguous || !allSlotsAvailable || holdingRef.current) return;
    holdingRef.current = true;
    setHolding(true);
    try {
      const booking = await bookingApi.hold(
        selectedCourt.courtId,
        playDate,
        selectedSlots.map((slot) => slot.timeSlotId)
      );
      setHold(booking);
      clearSelection();
      await loadAvailability();
    } catch (error) {
      clearSelection();
      toast.error(getErrorMessage(error));
      await loadAvailability();
    } finally {
      holdingRef.current = false;
      setHolding(false);
    }
  };

  const payWithVnPay = async () => {
    if (!hold || paying || !hold.holdExpiresAt) return;
    setPaying(true);
    try {
      const payment = await bookingApi.createVnPayPayment(hold.id);
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaying(false);
    }
  };

  const cancelHold = async () => {
    if (!hold || cancellingHold) return;
    setCancellingHold(true);
    try {
      await bookingApi.cancel(hold.id, 'Khách hàng hủy giữ chỗ trước khi thanh toán');
      setHold(null);
      toast.success('Đã hủy giữ chỗ.');
      await loadAvailability();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancellingHold(false);
    }
  };

  const expireHold = useCallback(() => {
    setHold(null);
    toast.error('Hết thời gian giữ chỗ. Vui lòng chọn lại khung giờ.');
    void loadAvailability();
  }, [loadAvailability]);

  return (
    <section className="space-y-6 pb-20 lg:pb-0">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Đặt sân trực tuyến</h1>
        <p className="mt-1 text-sm text-gray-500">Chạm hoặc kéo qua các khung giờ còn trống để chọn liên tiếp. Lịch được cập nhật theo thời gian thực.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
      <form onSubmit={submitFilters} className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><MapPin size={16} /> Cơ sở</span>
          <select value={facilityId} onChange={(event) => { clearSelection(); setFacilityId(Number(event.target.value)); }} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            {bookingCatalog.facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>{facility.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><Trophy size={16} /> Môn thể thao</span>
          <select value={sportId} onChange={(event) => { clearSelection(); setSportId(Number(event.target.value)); }} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            {bookingCatalog.sports.map((sport) => (
              <option key={sport.id} value={sport.id}>{sport.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><CalendarDays size={16} /> Ngày chơi</span>
          <input type="date" min={today()} required value={playDate} onChange={(event) => { clearSelection(); setPlayDate(event.target.value); }} className="w-full rounded-xl border border-gray-200 px-3 py-2.5" />
        </label>
        <button type="submit" disabled={loading} className="self-end rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
          {loading ? <LoaderCircle className="mx-auto animate-spin" size={20} /> : 'Xem lịch sân'}
        </button>
      </form>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
        {[
          ['bg-green-500', 'Trống'],
          ['bg-green-700', 'Đã chọn'],
          ['bg-yellow-400', 'Đang giữ chỗ'],
          ['bg-red-500', 'Đã đặt'],
          ['bg-purple-500', 'Sự kiện'],
          ['bg-gray-500', 'Bảo trì'],
          ['bg-amber-500', 'Giờ cao điểm'],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-2"><span className={`h-3 w-3 rounded ${color}`} />{label}</span>
        ))}
      </div>
      <p className="text-xs text-muted">
        Trên điện thoại, vuốt ngang hàng tiêu đề giờ để xem thêm khung; chạm một ô để chọn hoặc bỏ chọn, kéo qua các ô để chọn liên tiếp.
      </p>

      {loading
        ? <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-red-700" /></div>
        : availabilityError
          ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{availabilityError}</div>
          : <CourtTimeGrid
              courts={courts}
              selectedCourtId={selectedCourtId}
              selectedSlotIds={selectedSlotIds}
              isSlotInPast={isSlotInPast}
              onToggleSlot={toggleSlot}
              onDragSelect={selectDragRange}
            />}
      </div>
      <CourtBookingCart
        courtName={selectedCourt?.courtName ?? null}
        playDate={playDate}
        slots={selectedSlots}
        totalAmount={selectedTotal}
        selectionIsContiguous={selectionIsContiguous}
        allSlotsAvailable={allSlotsAvailable}
        holding={holding}
        onRemove={removeSelectedSlot}
        onHold={() => void holdSelectedSlot()}
      />
      </div>

      {hold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="payment-title" className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="payment-title" className="text-xl font-bold">Thanh toán giữ chỗ</h2>
                <p className="mt-1 text-sm text-gray-500">Mã đơn: {hold.bookingCode}</p>
              </div>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">Chờ thanh toán</span>
            </div>
            {hold.details.length > 0 && (
              <p className="text-sm text-gray-600">
                {hold.details[0].courtName} · {hold.details[0].facilityName} · {hold.details[0].playDate}
                {' · '}{hold.details[0].startTime.slice(0, 5)}–{hold.details.at(-1)?.endTime.slice(0, 5)}
                {' · '}{hold.details.length} giờ
              </p>
            )}
            <div className="flex items-center justify-between rounded-xl bg-yellow-50 p-4 text-yellow-900">
              <span className="text-sm font-medium">Thời gian còn lại</span>
              {hold.holdExpiresAt
                ? <HoldCountdownTimer key={hold.id} expiresAt={hold.holdExpiresAt} onExpire={expireHold} />
                : <span className="font-mono font-bold">Không có thời hạn giữ chỗ</span>}
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
              <div className="mx-auto mb-2 grid h-28 w-28 place-items-center rounded-lg bg-red-50 text-sm font-bold text-red-700">VNPay</div>
              <p className="text-sm text-gray-600">Thanh toán an toàn qua VNPay Sandbox</p>
              <p className="mt-1 font-mono font-bold">{hold.bookingCode}</p>
            </div>
            <p className="text-center text-lg font-bold">{hold.totalAmount.toLocaleString('vi-VN')} đ</p>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={paying || cancellingHold} onClick={() => void cancelHold()} className="rounded-xl border border-red-200 px-4 py-2 text-red-700 disabled:opacity-60">
                {cancellingHold ? 'Đang hủy...' : 'Hủy giữ chỗ'}
              </button>
              <button type="button" disabled={paying || cancellingHold || !hold.holdExpiresAt} onClick={() => void payWithVnPay()} className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
                {paying ? 'Đang chuyển đến VNPay...' : 'Thanh toán qua VNPay'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
