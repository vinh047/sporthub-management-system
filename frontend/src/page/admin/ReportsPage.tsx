import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, BadgeDollarSign, Building, Calendar, ChartColumn, Clock, Flame,
  LoaderCircle, Percent, RefreshCw, Trophy,
} from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { reportApi } from '../../api/reportApi';
import type { DashboardAnalyticsResponse } from '../../api/reportApi';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('sv-SE');
};

export default function ReportsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState<string>('');
  const [sportId, setSportId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => daysAgoIso(6));
  const [toDate, setToDate] = useState<string>(todayIso);
  const [onlyPeakHours, setOnlyPeakHours] = useState(false);

  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()])
      .then(([facs, sps]) => {
        setFacilities(facs);
        setSports(sps);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (fromDate > toDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setLoading(true);
    try {
      const data = await reportApi.getAnalytics({
        facilityId: facilityId ? Number(facilityId) : undefined,
        sportId: sportId ? Number(sportId) : undefined,
        from: fromDate,
        to: toDate,
        onlyPeakHours,
      });
      setAnalytics(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [facilityId, sportId, fromDate, toDate, onlyPeakHours]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const rev = analytics?.revenue;
  const occ = analytics?.occupancy;
  const maxDailyRevenue = Math.max(1, ...(rev?.dailyBreakdown.map((d) => d.revenue) ?? [1]));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-700">Thống kê & Phân tích Quản trị · UC26</p>
          <h2 className="mt-1 text-2xl font-bold">Báo cáo Doanh thu & Tỷ lệ lấp đầy sân</h2>
          <p className="text-sm text-gray-500">
            Truy vấn dữ liệu đa chiều theo Cơ sở, Môn thể thao và Khung giờ vàng (17:00 – 21:00).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-2xs hover:border-red-200 hover:text-red-700 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-red-600' : ''} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Bộ lọc truy vấn */}
      <section className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
            <Building size={13} /> Cơ sở
          </span>
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputClass}>
            <option value="">Tất cả cơ sở</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
            <Trophy size={13} /> Môn thể thao
          </span>
          <select value={sportId} onChange={(e) => setSportId(e.target.value)} className={inputClass}>
            <option value="">Tất cả bộ môn</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.sportName}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
            <Calendar size={13} /> Từ ngày
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
            <Calendar size={13} /> Đến ngày
          </span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="flex flex-col justify-end">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900">
            <input
              type="checkbox"
              checked={onlyPeakHours}
              onChange={(e) => setOnlyPeakHours(e.target.checked)}
              className="rounded border-amber-300 text-red-700 focus:ring-red-600"
            />
            <Flame size={15} className="text-amber-600 shrink-0" />
            <span>Chỉ tính Giờ vàng</span>
          </label>
        </div>
      </section>

      {loading || !rev || !occ ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <LoaderCircle size={24} className="mr-2 animate-spin text-red-600" />
          Đang tổng hợp dữ liệu doanh thu & tỷ lệ lấp đầy sân...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500">Tổng doanh thu</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700">
                  <BadgeDollarSign size={20} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">
                {rev.totalRevenue.toLocaleString('vi-VN')} đ
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Đặt sân: <strong>{rev.bookingRevenue.toLocaleString('vi-VN')} đ</strong> · Giải đấu:{' '}
                <strong>{rev.tournamentRevenue.toLocaleString('vi-VN')} đ</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500">Doanh thu Giờ vàng</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Flame size={20} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-amber-700">
                {rev.peakHourRevenue.toLocaleString('vi-VN')} đ
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Giờ thường: <strong>{rev.offPeakRevenue.toLocaleString('vi-VN')} đ</strong> ({rev.peakBookedSlots}/
                {rev.totalBookedSlots} ca giờ vàng)
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500">Tỷ lệ lấp đầy chung</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Percent size={20} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">{occ.occupancyRate}%</p>
              <p className="mt-1 text-xs text-gray-500">
                Đã lấp đầy <strong>{occ.occupiedSlots}</strong> / {occ.totalSlots} khung giờ khả dụng
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500">Lấp đầy Giờ vàng</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <Activity size={20} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-purple-700">{occ.peakOccupancyRate}%</p>
              <p className="mt-1 text-xs text-gray-500">
                Giờ vàng: <strong>{occ.peakOccupiedSlots}/{occ.peakTotalSlots}</strong> · Giờ thường:{' '}
                <strong>{occ.offPeakOccupancyRate}%</strong>
              </p>
            </div>
          </section>

          {/* Biểu đồ Doanh thu theo ngày & Thống kê theo Khung giờ vàng */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ChartColumn size={18} className="text-red-700" /> Biến động Doanh thu theo ngày
                  </h3>
                  <p className="text-xs text-gray-500">
                    Phân tách doanh thu Giờ vàng và Giờ thường ({rev.from} → {rev.to})
                  </p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {rev.totalBookings} đơn đặt sân
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {rev.dailyBreakdown.map((d) => {
                  const pct = Math.min(100, Math.round((d.revenue / maxDailyRevenue) * 100));
                  return (
                    <div key={d.date} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{d.date}</span>
                        <span className="text-gray-600">
                          <strong className="text-gray-900">{d.revenue.toLocaleString('vi-VN')} đ</strong> ({d.bookingCount} đơn · {d.occupiedSlots} ca)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Thống kê theo Khung giờ & Giờ vàng */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" /> Tỷ lệ lấp đầy & Doanh thu theo Khung giờ
                </h3>
                <p className="text-xs text-gray-500">
                  Các khung giờ gắn nhãn <strong className="text-amber-700">Giờ vàng</strong> áp dụng bảng giá cao điểm.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
                {occ.hourlyBreakdown.map((slot) => {
                  const revSlot = rev.peakHourBreakdown?.find((r) => r.timeSlotId === slot.timeSlotId);
                  return (
                    <div
                      key={slot.timeSlotId}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs ${
                        slot.isPeakHour ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {slot.isPeakHour && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Flame size={11} /> Giờ vàng
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          DT: <strong>{(revSlot?.revenue ?? 0).toLocaleString('vi-VN')} đ</strong>
                        </span>
                        <span className="w-24 text-right font-bold text-emerald-700">
                          {slot.occupancyRate}% ({slot.occupiedSlots}/{slot.totalSlots})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Thống kê theo Cơ sở & theo Môn thể thao */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Building size={18} className="text-red-700" /> Thống kê theo Cơ sở (Chi nhánh)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-left uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5">Cơ sở</th>
                      <th className="px-3 py-2.5 text-right">Doanh thu</th>
                      <th className="px-3 py-2.5 text-right">DT Giờ vàng</th>
                      <th className="px-3 py-2.5 text-right">Lấp đầy</th>
                      <th className="px-3 py-2.5 text-right">Lấp đầy Giờ vàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rev.facilityBreakdown?.map((f) => {
                      const facOcc = occ.facilityBreakdown?.find((o) => o.facilityId === f.facilityId);
                      return (
                        <tr key={f.facilityId} className="border-t border-gray-100">
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{f.facilityName}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-700">
                            {f.totalRevenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3 py-2.5 text-right text-amber-700 font-semibold">
                            {f.peakHourRevenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                            {facOcc?.occupancyRate ?? 0}% ({facOcc?.occupiedSlots ?? 0}/{facOcc?.totalSlots ?? 0})
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-purple-700">
                            {facOcc?.peakOccupancyRate ?? 0}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Trophy size={18} className="text-red-700" /> Thống kê theo Môn thể thao
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-left uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5">Bộ môn</th>
                      <th className="px-3 py-2.5 text-right">Doanh thu</th>
                      <th className="px-3 py-2.5 text-right">DT Giờ vàng</th>
                      <th className="px-3 py-2.5 text-right">Lấp đầy</th>
                      <th className="px-3 py-2.5 text-right">Lấp đầy Giờ vàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rev.sportBreakdown?.map((s) => {
                      const spOcc = occ.sportBreakdown?.find((o) => o.sportId === s.sportId);
                      return (
                        <tr key={s.sportId} className="border-t border-gray-100">
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{s.sportName}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-red-700">
                            {s.totalRevenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3 py-2.5 text-right text-amber-700 font-semibold">
                            {s.peakHourRevenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                            {spOcc?.occupancyRate ?? 0}% ({spOcc?.occupiedSlots ?? 0}/{spOcc?.totalSlots ?? 0})
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-purple-700">
                            {spOcc?.peakOccupancyRate ?? 0}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Chi tiết tỷ lệ lấp đầy từng sân con */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">
              Chi tiết tỷ lệ lấp đầy theo từng Sân ({occ.courtBreakdown.length} sân)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {occ.courtBreakdown.map((c) => (
                <div key={c.courtId} className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{c.courtName}</p>
                      <p className="text-[11px] text-gray-500">
                        {c.facilityName} · {c.sportName}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      {c.occupancyRate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, c.occupancyRate)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Tổng: {c.occupiedSlots}/{c.totalSlots} ca</span>
                    <span className="font-semibold text-amber-700">
                      Giờ vàng: {c.peakOccupancyRate}% ({c.peakOccupiedSlots}/{c.peakTotalSlots})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
