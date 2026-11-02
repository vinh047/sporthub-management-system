import { useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import { Banknote, CircleCheck, Clock, Landmark, LoaderCircle } from 'lucide-react';
import { posApi } from '../../api/posApi';
import { getErrorMessage } from '../../api/errors';

// TODO: thay bằng API danh sách sân và khung giờ của TV3 khi có
const COURTS = [
  { id: 1, name: 'Sân 1' },
  { id: 2, name: 'Sân 2' },
];
const TIME_SLOTS = [
  { id: 1, label: '17:00–18:00' },
  { id: 2, label: '18:00–19:00' },
  { id: 3, label: '19:00–20:00' },
];
const TEMP_SLOT_PRICE = 100_000; // TODO: lấy giá từ bảng giá của TV3

const PAYMENT_METHODS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Tiền mặt', icon: Banknote },
  { id: 2, label: 'Chuyển khoản', icon: Landmark },
];

const todayString = () => new Date().toLocaleDateString('sv-SE'); // dạng YYYY-MM-DD

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const labelClass = 'text-sm font-medium text-gray-700';

export default function PosPage() {
  const [courtId, setCourtId] = useState(COURTS[0].id);
  const [playDate, setPlayDate] = useState(todayString);
  const [slotIds, setSlotIds] = useState<number[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const toggleSlot = (id: number) =>
    setSlotIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await posApi.createBooking({
        courtId, playDate, timeSlotIds: slotIds, guestName, guestPhone, paymentMethodId,
      });
      toast.success(res.message ?? 'Đặt sân thành công!');
      setSlotIds([]);
      setGuestName('');
      setGuestPhone('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Bán sân tại quầy</h2>
        <p className="text-sm text-gray-500">Đặt nhanh cho khách vãng lai, thu tiền tại chỗ.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelClass}>Sân</span>
            <select value={courtId} onChange={(e) => setCourtId(Number(e.target.value))} className={inputClass}>
              {COURTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Ngày chơi</span>
            <input type="date" value={playDate} min={todayString()} onChange={(e) => setPlayDate(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Khung giờ</span>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((s) => {
              const selected = slotIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSlot(s.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    selected ? 'border-red-700 bg-red-700 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-red-200'
                  }`}
                >
                  {selected ? <CircleCheck size={15} /> : <Clock size={15} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelClass}>Tên khách</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Số điện thoại</span>
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Thanh toán</span>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentMethodId(id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  paymentMethodId === id ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700 hover:border-red-200'
                }`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
          <div>
            <p className="text-xs text-gray-500">Tổng tiền ({slotIds.length} khung giờ)</p>
            <p className="text-2xl font-extrabold text-red-700">{(slotIds.length * TEMP_SLOT_PRICE).toLocaleString('vi-VN')} đ</p>
          </div>
          <button
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-6 py-3 font-semibold text-white shadow-md hover:from-red-800 hover:to-red-700 disabled:opacity-60"
            type="submit"
            disabled={submitting || slotIds.length === 0}
          >
            {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheck size={18} />}
            {submitting ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
          </button>
        </div>
      </form>
    </div>
  );
}
