import { useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
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

const todayString = () => new Date().toLocaleDateString('sv-SE'); // dạng YYYY-MM-DD

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

  const inputClass = 'w-full px-3 py-2 border border-border rounded bg-background';

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Bán sân tại quầy</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-surface border border-border rounded-xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span>Sân</span>
            <select value={courtId} onChange={(e) => setCourtId(Number(e.target.value))} className={inputClass}>
              {COURTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span>Ngày chơi</span>
            <input type="date" value={playDate} min={todayString()} onChange={(e) => setPlayDate(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="text-sm space-y-1">
          <span>Khung giờ</span>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSlot(s.id)}
                className={`px-3 py-1.5 rounded border ${
                  slotIds.includes(s.id) ? 'bg-primary text-white border-primary' : 'border-border bg-background'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span>Tên khách</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm space-y-1">
            <span>Số điện thoại</span>
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="text-sm flex gap-4">
          <label><input type="radio" checked={paymentMethodId === 1} onChange={() => setPaymentMethodId(1)} /> Tiền mặt</label>
          <label><input type="radio" checked={paymentMethodId === 2} onChange={() => setPaymentMethodId(2)} /> Chuyển khoản</label>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="font-semibold">
            Tổng: {(slotIds.length * TEMP_SLOT_PRICE).toLocaleString('vi-VN')} đ
          </span>
          <button className="btn btn-primary disabled:opacity-60" type="submit" disabled={submitting || slotIds.length === 0}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
          </button>
        </div>
      </form>
    </div>
  );
}
