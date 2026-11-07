import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, LoaderCircle, Wrench } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, FacilityDetail } from '../../api/facilityModels';
import { useAuthStore } from '../../store/authStore';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const today = () => new Date().toLocaleDateString('sv-SE');

export default function MaintenancePage() {
  const assignedFacilityId = useAuthStore((state) => state.user?.facilityId ?? null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<number | null>(assignedFacilityId);
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [courtId, setCourtId] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const activeFacilityId = facilities.some((item) => item.id === facilityId)
    ? facilityId : facilities[0]?.id ?? null;

  useEffect(() => {
    let active = true;
    void facilityApi.getFacilities().then((rows) => {
      if (!active) return;
      setFacilities(rows);
    }).catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (activeFacilityId === null) return;
    let active = true;
    void facilityApi.getFacility(activeFacilityId).then((value) => {
      if (!active) return;
      setFacility(value);
      setCourtId((current) => value.courts.some((court) => String(court.id) === current)
        ? current : String(value.courts.find((court) => court.isActive)?.id ?? ''));
    }).catch((error: unknown) => toast.error(getErrorMessage(error)));
    return () => { active = false; };
  }, [activeFacilityId]);

  const activeCourts = useMemo(() => facility?.courts.filter((court) => court.isActive) ?? [], [facility]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!courtId) {
      toast.error('Chọn sân cần bảo trì.');
      return;
    }
    setSubmitting(true);
    try {
      await facilityApi.lockCourt({
        courtId: Number(courtId),
        maintenanceDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        reason: reason.trim(),
      });
      toast.success('Đã tạo lịch khóa sân bảo trì.');
      setReason('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <header>
        <p className="text-sm font-medium text-red-700">UC06 · Vận hành sân</p>
        <h2 className="mt-1 text-2xl font-bold">Khóa sân bảo trì</h2>
        <p className="mt-1 text-sm text-gray-500">Chỉ các khung giờ giao với khoảng bảo trì bị khóa khỏi availability.</p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Cơ sở</span>
            <select required disabled={loading || facilities.length === 0} value={activeFacilityId ?? ''} onChange={(e) => setFacilityId(Number(e.target.value) || null)} className={inputClass}>
              {facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Sân</span>
            <select required disabled={!activeCourts.length} value={courtId} onChange={(e) => setCourtId(e.target.value)} className={inputClass}>
              <option value="">Chọn sân</option>
              {activeCourts.map((court) => <option key={court.id} value={court.id}>{court.courtName} · {court.sportName}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Ngày bảo trì</span>
            <span className="relative block"><CalendarClock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="date" min={today()} value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} className={`${inputClass} pl-10`} />
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Bắt đầu</span>
            <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Kết thúc</span>
            <input required type="time" min={startTime} value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Lý do bảo trì</span>
          <textarea required maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: thay lưới, kiểm tra mặt sân..." className={`${inputClass} resize-y`} />
        </label>

        {!loading && facilities.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Chưa có cơ sở đang hoạt động. Hãy tạo cơ sở và sân trước.</p>}
        {facility && activeCourts.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Cơ sở này chưa có sân đang hoạt động.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">Lịch bảo trì trùng giờ sẽ bị từ chối.</p>
          <button type="submit" disabled={submitting || loading || activeCourts.length === 0} className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
            {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Wrench size={17} />}Đặt lịch bảo trì
          </button>
        </div>
      </form>
    </div>
  );
}
