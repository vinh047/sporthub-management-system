import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import { Banknote, CircleCheck, Clock, Landmark, LoaderCircle } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { CourtAvailability, Facility, Sport } from '../../api/facilityModels';
import { posApi } from '../../api/posApi';
import { useAuthStore } from '../../store/authStore';

const PAYMENT_METHODS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Tiền mặt', icon: Banknote },
  { id: 2, label: 'Chuyển khoản', icon: Landmark },
];

const todayString = () => new Date().toLocaleDateString('sv-SE');
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const labelClass = 'text-sm font-medium text-gray-700';

export default function PosPage() {
  const user = useAuthStore((state) => state.user);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [courtOptions, setCourtOptions] = useState<CourtAvailability[]>([]);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [playDate, setPlayDate] = useState(todayString);
  const [slotIds, setSlotIds] = useState<number[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const availableFacilities = useMemo(() => user?.role === 'STAFF' && user.facilityId
    ? facilities.filter((facility) => facility.id === user.facilityId)
    : facilities, [facilities, user?.facilityId, user?.role]);
  const selectedCourt = courtOptions.find((court) => court.courtId === courtId);
  const selectedSlots = selectedCourt?.slots ?? [];
  const total = selectedSlots
    .filter((slot) => slotIds.includes(slot.timeSlotId))
    .reduce((sum, slot) => sum + slot.price, 0);

  useEffect(() => {
    let active = true;
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()]).then(([facilityRows, sportRows]) => {
      if (!active) return;
      const allowedFacilities = user?.role === 'STAFF' && user.facilityId
        ? facilityRows.filter((facility) => facility.id === user.facilityId)
        : facilityRows;
      setFacilities(facilityRows);
      setSports(sportRows);
      setFacilityId(allowedFacilities[0] ? String(allowedFacilities[0].id) : '');
      setSportId(sportRows[0] ? String(sportRows[0].id) : '');
    }).catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.facilityId, user?.role]);

  useEffect(() => {
    if (!facilityId || !sportId) {
      setCourtOptions([]);
      setCourtId(null);
      setSlotIds([]);
      return;
    }
    let active = true;
    setLoadingAvailability(true);
    void facilityApi.getAvailability(Number(facilityId), Number(sportId), playDate).then((courts) => {
      if (!active) return;
      setCourtOptions(courts);
      setCourtId((current) => courts.some((court) => court.courtId === current)
        ? current : courts[0]?.courtId ?? null);
      setSlotIds([]);
    }).catch((error: unknown) => {
      if (active) {
        setCourtOptions([]);
        setCourtId(null);
        toast.error(getErrorMessage(error));
      }
    }).finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [facilityId, sportId, playDate]);

  const toggleSlot = (id: number) =>
    setSlotIds((prev) => (prev.includes(id) ? prev.filter((slot) => slot !== id) : [...prev, id]));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!courtId || slotIds.length === 0) return;
    setSubmitting(true);
    try {
      const response = await posApi.createBooking({
        courtId, playDate, timeSlotIds: slotIds, guestName, guestPhone, paymentMethodId,
      });
      toast.success(response.message ?? 'Đặt sân thành công!');
      setSlotIds([]);
      setGuestName('');
      setGuestPhone('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <p className="text-sm font-medium text-red-700">POS · Đặt sân tại quầy</p>
        <h2 className="mt-1 text-2xl font-bold">Bán sân tại quầy</h2>
        <p className="text-sm text-gray-500">Chọn cơ sở, bộ môn, sân và khung giờ còn trống; giá lấy từ bảng giá hiện hành.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cơ sở">
            <select required disabled={loading || availableFacilities.length === 0} value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputClass}>
              {availableFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          </Field>
          <Field label="Bộ môn">
            <select required disabled={loading || sports.length === 0} value={sportId} onChange={(e) => setSportId(e.target.value)} className={inputClass}>
              {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.sportName}</option>)}
            </select>
          </Field>
          <Field label="Sân">
            <select required disabled={loadingAvailability || courtOptions.length === 0} value={courtId ?? ''} onChange={(e) => { setCourtId(Number(e.target.value) || null); setSlotIds([]); }} className={inputClass}>
              {courtOptions.map((court) => <option key={court.courtId} value={court.courtId}>{court.courtName}</option>)}
            </select>
          </Field>
          <Field label="Ngày chơi">
            <input required type="date" value={playDate} min={todayString()} onChange={(e) => setPlayDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>Khung giờ</span>
            {loadingAvailability && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><LoaderCircle size={14} className="animate-spin" />Đang tải lịch</span>}
          </div>
          {selectedSlots.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Không có khung giờ cho lựa chọn này.</p>
            : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selectedSlots.map((slot) => {
                const selected = slotIds.includes(slot.timeSlotId);
                return <button key={slot.timeSlotId} type="button" disabled={!slot.isAvailable || loadingAvailability} onClick={() => toggleSlot(slot.timeSlotId)} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${selected ? 'border-red-700 bg-red-700 text-white' : slot.isAvailable ? 'border-gray-200 bg-white text-gray-700 hover:border-red-200' : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'}`}>
                  <span className="flex items-center gap-2">{selected ? <CircleCheck size={15} /> : <Clock size={15} />}{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}{slot.isPeakHour && <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">Peak</span>}</span>
                  <span className="whitespace-nowrap text-xs">{slot.isAvailable ? `${slot.price.toLocaleString('vi-VN')} đ` : 'Đã kín'}</span>
                </button>;
              })}
            </div>}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên khách"><input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} /></Field>
          <Field label="Số điện thoại"><input required type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} /></Field>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Thanh toán</span>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setPaymentMethodId(id)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${paymentMethodId === id ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700 hover:border-red-200'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </div>
        </div>

        {availableFacilities.length === 0 && !loading && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Tài khoản chưa được gán cơ sở hoặc chưa có cơ sở đang hoạt động.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
          <div>
            <p className="text-xs text-gray-500">Tổng tiền ({slotIds.length} khung giờ)</p>
            <p className="text-2xl font-extrabold text-red-700">{total.toLocaleString('vi-VN')} đ</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-6 py-3 font-semibold text-white shadow-md hover:from-red-800 hover:to-red-700 disabled:opacity-60" type="submit" disabled={submitting || loadingAvailability || !courtId || slotIds.length === 0}>
            {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheck size={18} />}{submitting ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className={labelClass}>{label}</span>{children}</label>;
}
