import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, Crown, Search, Trophy, Users } from 'lucide-react';
import { PublicSiteFooter, PublicSiteHeader } from '../../components/PublicSiteChrome';
import SystemStatus from '../../components/SystemStatus';
import { notifyComingSoon } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';
import { facilityApi } from '../../api/facilityApi';
import type { CourtAvailability, Facility, Sport } from '../../api/facilityModels';
import { getErrorMessage } from '../../api/errors';
import toast from 'react-hot-toast';

const TODAY = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

const STATS = [
  { value: '4', label: 'Môn thể thao' },
  { value: '10′', label: 'Giữ chỗ khi đặt online' },
  { value: '24/7', label: 'Đặt sân online' },
  { value: 'Live', label: 'Lịch sân thời gian thực' },
];

const SERVICES: { title: string; description: string; feature?: FeatureKey; to?: string; icon: LucideIcon; tint: string }[] = [
  { title: 'Đặt sân online', description: 'Xem lịch trống theo thời gian thực, giữ chỗ 10 phút và thanh toán bằng VietQR.', feature: 'booking', icon: CalendarDays, tint: 'bg-red-50 text-red-700' },
  { title: 'Buổi chơi Social', description: 'Mua vé tham gia buổi giao lưu hợp trình độ, không lo thiếu người.', feature: 'social', icon: Users, tint: 'bg-amber-50 text-amber-600' },
  { title: 'Giải đấu', description: 'Đăng ký đội, theo dõi nhánh đấu và tỉ số cập nhật trực tiếp.', feature: 'tournaments', icon: Trophy, tint: 'bg-emerald-50 text-emerald-600' },
  { title: 'Ưu đãi thành viên', description: 'Xem các chương trình khuyến mãi đang mở và đăng nhập để nhận voucher.', to: '/vouchers', icon: Crown, tint: 'bg-purple-50 text-purple-600' },
];

const STEPS = [
  { title: 'Chọn môn và ngày chơi', description: 'Lọc theo môn thể thao, cơ sở và ngày để xem các khung giờ còn trống.' },
  { title: 'Giữ chỗ 10 phút', description: 'Chọn khung giờ, hệ thống giữ chỗ cho bạn trong 10 phút để thanh toán.' },
  { title: 'Thanh toán và nhận sân', description: 'Quét mã VietQR, đến sân đọc mã đơn hoặc số điện thoại để check-in.' },
];

function QuickSearch() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sportId, setSportId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [date, setDate] = useState(TODAY);
  const [results, setResults] = useState<CourtAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([facilityApi.getSports(), facilityApi.getFacilities()]).then(([sportRows, facilityRows]) => {
      if (!active) return;
      setSports(sportRows);
      setFacilities(facilityRows);
    }).catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!sportId || !facilityId) {
      toast.error('Chọn môn thể thao và cơ sở để tìm sân.');
      return;
    }
    setSearching(true);
    void facilityApi.getAvailability(Number(facilityId), Number(sportId), date)
      .then(setResults)
      .catch((error: unknown) => toast.error(getErrorMessage(error)))
      .finally(() => setSearching(false));
  };

  const fieldClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600';

  return (
    <form id="quick-search" onSubmit={handleSubmit} className="bg-white text-gray-900 rounded-3xl shadow-2xl p-7 space-y-4 w-full max-w-md">
      <div>
        <h2 className="text-xl font-bold">Tìm sân nhanh</h2>
        <p className="text-sm text-gray-500">Chọn môn, cơ sở, ngày — xem sân trống ngay</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Môn thể thao</span>
        <select required disabled={loading} value={sportId} onChange={(e) => setSportId(e.target.value)} className={fieldClass}>
          <option value="">Chọn môn thể thao</option>
          {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.sportName}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Cơ sở</span>
        <select required disabled={loading} value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={fieldClass}>
          <option value="">Chọn cơ sở</option>
          {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Ngày chơi</span>
        <input type="date" value={date} min={TODAY} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </label>
      <button type="submit" disabled={loading || searching || sports.length === 0 || facilities.length === 0} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-semibold shadow-lg disabled:opacity-60">
        <Search size={18} /> {searching ? 'Đang tìm...' : 'Tìm sân ngay'}
      </button>
      {results.length > 0 && <div className="max-h-52 space-y-2 overflow-y-auto border-t border-gray-100 pt-3">
        {results.map((court) => {
          const free = court.slots.filter((slot) => slot.isAvailable);
          return <div key={court.courtId} className="rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-semibold">{court.courtName} <span className="font-normal text-gray-500">· {free.length} slot trống</span></p>
            <p className="mt-1 text-xs text-gray-500">{free.slice(0, 3).map((slot) => `${slot.startTime.slice(0, 5)} · ${slot.price.toLocaleString('vi-VN')}đ`).join(' | ') || 'Không còn slot trống'}</p>
          </div>;
        })}
      </div>}
      {!loading && (sports.length === 0 || facilities.length === 0) && <p className="text-xs text-amber-700">Chưa có danh mục môn thể thao hoặc cơ sở hoạt động.</p>}
    </form>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden text-white bg-[radial-gradient(ellipse_at_top_left,#6b1515_0%,#3d0b0b_45%,#250606_100%)]">
      <div className="absolute -right-32 -top-32 w-[32rem] h-[32rem] rounded-full bg-red-700/20 blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-28 grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wider text-red-200 uppercase mb-4"><span className="h-2 w-2 rounded-full bg-red-300 animate-pulse" />4 môn thể thao · chuỗi cụm sân đa cơ sở</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Đặt sân thể thao<br />trong 30 giây
          </h1>
          <p className="text-lg text-red-50/85 max-w-xl mb-8">
            SportHub kết nối bạn với sân cầu lông, pickleball, bóng đá mini và tennis. Xem khung giờ trống
            theo thời gian thực, giữ chỗ và thanh toán ngay — không cần gọi điện.
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <button type="button" onClick={() => notifyComingSoon('schedule')} className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-red-700 hover:bg-red-800 font-semibold shadow-lg">
              <Search size={18} /> Tìm sân trống
            </button>
            <a href="#quick-search" className="px-7 py-3.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 font-semibold text-white">
              Xem tất cả sân
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-xl">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold">{s.value}</p>
                <p className="text-sm text-red-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <QuickSearch />
        </div>
      </div>
      {/* Đường cong phía dưới */}
      <svg className="absolute bottom-0 left-0 w-full h-16 text-background" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0,40 C360,0 1080,80 1440,24 L1440,64 L0,64 Z" />
      </svg>
    </section>
  );
}

/** Trang chủ công khai (chưa cần đăng nhập) */
export default function HomePage() {
  return (
    <div id="top" className="min-h-screen bg-background text-text">
      <PublicSiteHeader />
      <Hero />

      <main className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        <section>
          <h2 className="text-2xl font-bold mb-2">Dịch vụ của SportHub</h2>
          <p className="text-muted mb-6">Mọi thứ bạn cần để chơi thể thao, trong một ứng dụng.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.title} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex flex-col transition hover:-translate-y-0.5 hover:shadow-md">
                <span className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${s.tint}`}><s.icon size={22} /></span>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted flex-1">{s.description}</p>
                {s.feature
                  ? <button type="button" onClick={() => s.feature && notifyComingSoon(s.feature)} className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary text-left hover:gap-2 transition-all">Xem chi tiết <ArrowRight size={16} /></button>
                  : s.to && <Link to={s.to} className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary text-left hover:gap-2 transition-all">Xem chi tiết <ArrowRight size={16} /></Link>}
              </div>
            ))}
          </div>
        </section>

        <section id="huong-dan" className="scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6">Đặt sân chỉ với 3 bước</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
                <span className="w-10 h-10 rounded-full bg-primary text-white font-bold grid place-items-center mb-4">{i + 1}</span>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <SystemStatus />
      </main>

      <PublicSiteFooter />
    </div>
  );
}
