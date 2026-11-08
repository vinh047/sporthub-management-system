import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { BadgeDollarSign, LoaderCircle, Search } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, SlotAvailability, Sport } from '../../api/facilityModels';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const today = () => new Date().toLocaleDateString('sv-SE');
type EditableSlot = SlotAvailability & { hourlyRate: number; peak: boolean };

export default function PricingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [basePrice, setBasePrice] = useState('100000');
  const [weekendSurcharge, setWeekendSurcharge] = useState('20');
  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()]).then(([rows, sportRows]) => {
      if (!active) return;
      setFacilities(rows);
      setSports(sportRows);
      setFacilityId(rows[0] ? String(rows[0].id) : '');
      setSportId(sportRows[0] ? String(sportRows[0].id) : '');
    }).catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalPeak = useMemo(() => slots.filter((slot) => slot.peak).length, [slots]);

  const loadSlots = async () => {
    if (!facilityId || !sportId) {
      toast.error('Chọn cơ sở và bộ môn.');
      return;
    }
    setLoadingSlots(true);
    try {
      const courts = await facilityApi.getAvailability(Number(facilityId), Number(sportId), availabilityDate);
      const firstSlots = courts[0]?.slots ?? [];
      setSlots(firstSlots.map((slot) => ({
        ...slot,
        hourlyRate: slot.price || Number(basePrice),
        peak: slot.isPeakHour,
      })));
      if (!firstSlots.length) toast('Không tìm thấy sân/khung giờ cho bộ môn và cơ sở này.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingSlots(false);
    }
  };

  const updateSlot = (timeSlotId: number, patch: Partial<EditableSlot>) =>
    setSlots((current) => current.map((slot) => slot.timeSlotId === timeSlotId ? { ...slot, ...patch } : slot));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!facilityId || !sportId || slots.length === 0) {
      toast.error('Hãy tải danh sách khung giờ trước khi lưu bảng giá.');
      return;
    }
    setSaving(true);
    try {
      await facilityApi.upsertPricePolicy({
        facilityId: Number(facilityId),
        sportId: Number(sportId),
        basePrice: Number(basePrice),
        weekendSurchargePercent: Number(weekendSurcharge),
        effectiveFrom,
        rules: slots.map((slot) => ({
          timeSlotId: slot.timeSlotId,
          hourlyRate: slot.hourlyRate,
          isPeakHour: slot.peak,
        })),
      });
      toast.success('Đã lưu bảng giá.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-sm font-medium text-red-700">UC05 · Cấu hình giá</p>
        <h2 className="mt-1 text-2xl font-bold">Bảng giá động</h2>
        <p className="mt-1 text-sm text-gray-500">Thiết lập giá theo khung giờ và phụ thu cuối tuần cho từng cơ sở, bộ môn.</p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Cơ sở</span>
            <select required disabled={loading || facilities.length === 0} value={facilityId} onChange={(e) => { setFacilityId(e.target.value); setSlots([]); }} className={inputClass}>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Bộ môn</span>
            <select required disabled={sports.length === 0} value={sportId} onChange={(e) => { setSportId(e.target.value); setSlots([]); }} className={inputClass}>
              {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.sportName}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Ngày hiệu lực</span>
            <input required type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Ngày xem khung giờ</span>
            <input required type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} className={inputClass} />
          </label>
        </section>

        <section className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Giá cơ bản (đồng/slot)</span>
            <input required type="number" min={0} step={1000} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Phụ thu cuối tuần (%)</span>
            <input required type="number" min={0} step={1} value={weekendSurcharge} onChange={(e) => setWeekendSurcharge(e.target.value)} className={inputClass} />
          </label>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Giá theo khung giờ</h3>
            <p className="text-xs text-gray-500">Tải khung giờ từ lịch sân hiện có, sau đó chỉnh giá và đánh dấu giờ cao điểm.</p>
          </div>
          <button type="button" onClick={() => void loadSlots()} disabled={loadingSlots || loading || facilities.length === 0} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {loadingSlots ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}Tải khung giờ
          </button>
        </div>

        {slots.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Khung giờ</th><th className="px-4 py-3">Giá (đồng)</th><th className="px-4 py-3">Giờ cao điểm</th><th className="px-4 py-3">Giá hiện tại</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {slots.map((slot) => <tr key={slot.timeSlotId}>
                  <td className="px-4 py-3 font-medium text-gray-800">{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)} <span className="text-xs text-gray-400">#{slot.timeSlotId}</span></td>
                  <td className="px-4 py-3"><input aria-label={`Giá slot ${slot.timeSlotId}`} type="number" min={0} step={1000} value={slot.hourlyRate} onChange={(e) => updateSlot(slot.timeSlotId, { hourlyRate: Number(e.target.value) })} className="w-36 rounded-lg border border-gray-200 px-3 py-2 focus:border-red-600 focus:outline-none" /></td>
                  <td className="px-4 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={slot.peak} onChange={(e) => updateSlot(slot.timeSlotId, { peak: e.target.checked })} className="accent-red-700" /><span>{slot.peak ? 'Cao điểm' : 'Giờ thường'}</span></label></td>
                  <td className="px-4 py-3 text-gray-500">{slot.price.toLocaleString('vi-VN')} đ</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">Chọn cơ sở, nhập ID bộ môn rồi tải khung giờ để cấu hình.</div>}

        {!loading && facilities.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Cần tạo cơ sở trước khi cấu hình bảng giá.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">{slots.length} khung giờ · {totalPeak} khung cao điểm</p>
          <button type="submit" disabled={saving || slots.length === 0} className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
            {saving ? <LoaderCircle size={17} className="animate-spin" /> : <BadgeDollarSign size={17} />}Lưu cấu hình giá
          </button>
        </div>
        <p className="text-xs text-amber-700">Backend hiện tạo policy mới khi lưu; cần phối hợp hoàn thiện cập nhật policy hiện có trước khi dùng thay đổi này trên dữ liệu production.</p>
      </form>
    </div>
  );
}
