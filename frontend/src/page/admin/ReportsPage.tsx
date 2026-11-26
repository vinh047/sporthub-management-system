import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, ChartColumn, Clock, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { reportApi } from '../../api/reportApi';
import type { DashboardAnalyticsResponse } from '../../api/reportApi';
import { Badge, Button, Input, Select } from '../../components/ui';
import { LoadingState } from '../../components/shared';

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const firstDayOfMonthIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE');
};
const formatVnd = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} đ`;

export default function ReportsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState<string>('');
  const [sportId, setSportId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonthIso);
  const [toDate, setToDate] = useState<string>(todayIso);
  const [onlyPeakHours, setOnlyPeakHours] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'revenue' | 'occupancy'>('revenue');

  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()])
      .then(([facs, sps]) => {
        setFacilities(facs);
        setSports(sps);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
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
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const rev = analytics?.revenue;
  const occ = analytics?.occupancy;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-border bg-surface-raised p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <ChartColumn size={16} aria-hidden="true" /> SportHub Analytics · UC26
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Báo cáo Doanh thu & Tỷ lệ lấp đầy sân
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Phân tích doanh thu và công suất khai thác sân theo Cơ sở, Môn thể thao và Khung giờ vàng (Peak Hours).
          </p>
        </div>
        <Button variant="outline" loading={loading} onClick={() => void fetchAnalytics()}>
          <RefreshCw size={15} /> Làm mới
        </Button>
      </header>

      <section className="grid gap-3 rounded-card border border-border bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <Select label="Cơ sở" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
          <option value="">Toàn hệ thống</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>

        <Select label="Môn thể thao" value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Tất cả môn</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.sportName}</option>
          ))}
        </Select>

        <Input label="Từ ngày" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input label="Đến ngày" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <Button
          type="button"
          variant={onlyPeakHours ? 'primary' : 'outline'}
          onClick={() => setOnlyPeakHours((v) => !v)}
        >
          <Clock size={15} /> {onlyPeakHours ? 'Đang lọc: Giờ vàng' : 'Tất cả khung giờ'}
        </Button>
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface p-2">
        {[
          {
            active: activeTab === 'revenue',
            onClick: () => setActiveTab('revenue'),
            label: 'Thống kê Doanh thu',
            description: rev ? `Tổng: ${formatVnd(rev.totalRevenue)}` : 'Theo cơ sở, môn và giờ vàng',
          },
          {
            active: activeTab === 'occupancy',
            onClick: () => setActiveTab('occupancy'),
            label: 'Tỷ lệ lấp đầy sân',
            description: occ ? `Trung bình: ${occ.occupancyRate}%` : 'Công suất khai thác từng sân & khung giờ',
          },
        ].map(({ active, onClick, label, description }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`flex items-center gap-3 rounded-control border p-3 text-left transition-colors sm:p-4 ${
              active
                ? 'border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                : 'border-transparent text-muted hover:bg-surface-raised'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold sm:text-base">{label}</span>
              <span className="mt-1 hidden text-xs text-muted sm:block">{description}</span>
            </span>
            {active && <ArrowUpRight size={18} className="ml-auto hidden shrink-0 sm:block" />}
          </button>
        ))}
      </nav>

      {loading || !rev || !occ ? (
        <LoadingState label="Đang tổng hợp dữ liệu báo cáo…" />
      ) : activeTab === 'revenue' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Tổng doanh thu</span>
              <p className="mt-1 text-2xl font-bold text-primary">{formatVnd(rev.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted">{rev.totalBookings} đơn đặt sân</p>
            </div>
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Doanh thu Giờ vàng (Peak)</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatVnd(rev.peakHourRevenue)}</p>
              <p className="mt-1 text-xs text-muted">{rev.peakBookedSlots} ca giờ vàng</p>
            </div>
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Doanh thu Giờ thường</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatVnd(rev.offPeakRevenue)}</p>
              <p className="mt-1 text-xs text-muted">{rev.totalBookedSlots - rev.peakBookedSlots} ca giờ thường</p>
            </div>
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Giải đấu & Social</span>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatVnd(rev.tournamentRevenue + rev.socialRevenue)}
              </p>
              <p className="mt-1 text-xs text-muted">Lệ phí giải & vé giao lưu</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-border bg-surface-raised p-5 space-y-3">
              <h2 className="font-bold text-foreground">Doanh thu theo Cơ sở</h2>
              <div className="overflow-x-auto rounded-control border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-surface text-left uppercase text-muted">
                    <tr>
                      <th className="px-3.5 py-2.5">Cơ sở</th>
                      <th className="px-3.5 py-2.5 text-right">Giờ vàng</th>
                      <th className="px-3.5 py-2.5 text-right">Tổng thu</th>
                      <th className="px-3.5 py-2.5 text-right">Số ca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rev.facilityBreakdown.map((f) => (
                      <tr key={f.facilityId} className="border-t border-border">
                        <td className="px-3.5 py-2.5 font-semibold text-foreground">{f.facilityName}</td>
                        <td className="px-3.5 py-2.5 text-right text-muted">{formatVnd(f.peakHourRevenue)}</td>
                        <td className="px-3.5 py-2.5 text-right font-semibold text-primary">{formatVnd(f.totalRevenue)}</td>
                        <td className="px-3.5 py-2.5 text-right">{f.bookedSlotsCount} ca</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-card border border-border bg-surface-raised p-5 space-y-3">
              <h2 className="font-bold text-foreground">Doanh thu theo Môn thể thao</h2>
              <div className="overflow-x-auto rounded-control border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-surface text-left uppercase text-muted">
                    <tr>
                      <th className="px-3.5 py-2.5">Môn thể thao</th>
                      <th className="px-3.5 py-2.5 text-right">Giờ vàng</th>
                      <th className="px-3.5 py-2.5 text-right">Tổng thu</th>
                      <th className="px-3.5 py-2.5 text-right">Số ca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rev.sportBreakdown.map((s) => (
                      <tr key={s.sportId} className="border-t border-border">
                        <td className="px-3.5 py-2.5 font-semibold text-foreground">{s.sportName}</td>
                        <td className="px-3.5 py-2.5 text-right text-muted">{formatVnd(s.peakHourRevenue)}</td>
                        <td className="px-3.5 py-2.5 text-right font-semibold text-primary">{formatVnd(s.totalRevenue)}</td>
                        <td className="px-3.5 py-2.5 text-right">{s.bookedSlotsCount} ca</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Tỷ lệ lấp đầy chung</span>
              <p className="mt-1 text-2xl font-bold text-primary">{occ.occupancyRate}%</p>
              <p className="mt-1 text-xs text-muted">
                {occ.occupiedSlots}/{occ.totalSlots} ca khả dụng
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Lấp đầy Giờ vàng (Peak)</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{occ.peakOccupancyRate}%</p>
              <p className="mt-1 text-xs text-muted">
                {occ.peakOccupiedSlots}/{occ.peakTotalSlots} ca giờ vàng
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface-raised p-5">
              <span className="text-xs font-medium text-muted">Lấp đầy Giờ thường</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{occ.offPeakOccupancyRate}%</p>
              <p className="mt-1 text-xs text-muted">
                {occ.offPeakOccupiedSlots}/{occ.offPeakTotalSlots} ca giờ thường
              </p>
            </div>
          </div>

          <section className="rounded-card border border-border bg-surface-raised p-5 space-y-3">
            <h2 className="font-bold text-foreground">Tỷ lệ lấp đầy theo từng Sân con</h2>
            <div className="overflow-x-auto rounded-control border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface text-left uppercase text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5">Sân</th>
                    <th className="px-3.5 py-2.5">Cơ sở / Môn</th>
                    <th className="px-3.5 py-2.5 text-right">Đã đặt / Khả dụng</th>
                    <th className="px-3.5 py-2.5 text-right">Giờ vàng</th>
                    <th className="px-3.5 py-2.5 text-right">Tỷ lệ lấp đầy</th>
                  </tr>
                </thead>
                <tbody>
                  {occ.courtBreakdown.map((c) => (
                    <tr key={c.courtId} className="border-t border-border">
                      <td className="px-3.5 py-2.5 font-semibold text-foreground">{c.courtName}</td>
                      <td className="px-3.5 py-2.5 text-muted">{c.facilityName} · {c.sportName}</td>
                      <td className="px-3.5 py-2.5 text-right">{c.occupiedSlots}/{c.totalSlots} ca</td>
                      <td className="px-3.5 py-2.5 text-right">{c.peakOccupancyRate}%</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant={c.occupancyRate >= 50 ? 'primary' : 'neutral'}>
                          {c.occupancyRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
