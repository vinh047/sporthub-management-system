import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, Clock, Crown, Mail, MapPin, Menu, Phone, Search, Trophy, Users, X } from 'lucide-react';
import Brand from '../../components/Brand';
import SystemStatus from '../../components/SystemStatus';
import { bookingCatalog } from '../../api/bookingApi';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';
import { notifyComingSoon } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

// TODO: thay bằng thông tin thật của chuỗi sân
const CONTACT = { name: 'Hệ thống đặt sân SportHub', hotline: '0900 000 000', email: 'lienhe@sporthub.vn' };

// TODO (TV3): lấy danh sách môn và cơ sở từ GET /api/sports, GET /api/facility
const SPORTS = bookingCatalog.sports;
const FACILITIES = bookingCatalog.facilities;

const TODAY = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
const CURRENT_YEAR = new Date().getFullYear();

// Mục menu: "href" = cuộn tới phần trên trang, "feature" = chức năng chưa làm (bấm hiện người phụ trách)
const NAV: { label: string; href?: string; feature?: FeatureKey }[] = [
  { label: 'Trang chủ', href: '#top' },
  { label: 'Tìm sân', feature: 'facilities' },
  { label: 'Lịch đặt sân', feature: 'schedule' },
  { label: 'Social', feature: 'social' },
  { label: 'Giải đấu', feature: 'tournaments' },
  { label: 'Ưu đãi', feature: 'promotions' },
  { label: 'Hướng dẫn', href: '#huong-dan' },
  { label: 'Liên hệ', href: '#lien-he' },
];

const STATS = [
  { value: '4', label: 'Môn thể thao' },
  { value: '10′', label: 'Giữ chỗ khi đặt online' },
  { value: '24/7', label: 'Đặt sân online' },
  { value: 'Live', label: 'Lịch sân thời gian thực' },
];

const SERVICES: { title: string; description: string; feature: FeatureKey; icon: LucideIcon; tint: string }[] = [
  { title: 'Đặt sân online', description: 'Xem lịch trống theo thời gian thực, giữ chỗ 10 phút và thanh toán bằng VietQR.', feature: 'booking', icon: CalendarDays, tint: 'bg-red-50 text-red-700' },
  { title: 'Buổi chơi Social', description: 'Mua vé tham gia buổi giao lưu hợp trình độ, không lo thiếu người.', feature: 'social', icon: Users, tint: 'bg-amber-50 text-amber-600' },
  { title: 'Giải đấu', description: 'Đăng ký đội, theo dõi nhánh đấu và tỉ số cập nhật trực tiếp.', feature: 'tournaments', icon: Trophy, tint: 'bg-emerald-50 text-emerald-600' },
  { title: 'Ưu đãi thành viên', description: 'Tích điểm mỗi lần đặt sân, lên hạng Bạc, Vàng, Kim Cương để được giảm giá.', feature: 'vouchers', icon: Crown, tint: 'bg-purple-50 text-purple-600' },
];

const STEPS = [
  { title: 'Chọn môn và ngày chơi', description: 'Lọc theo môn thể thao, cơ sở và ngày để xem các khung giờ còn trống.' },
  { title: 'Giữ chỗ 10 phút', description: 'Chọn khung giờ, hệ thống giữ chỗ cho bạn trong 10 phút để thanh toán.' },
  { title: 'Thanh toán và nhận sân', description: 'Quét mã VietQR, đến sân đọc mã đơn hoặc số điện thoại để check-in.' },
];

function TopBar() {
  const { isAuthenticated, user } = useAuthStore();
  return (
    <div className="bg-[#2a0707] text-red-50/90 text-sm">
      <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <span className="flex items-center gap-1.5 truncate"><MapPin size={14} className="shrink-0" />{CONTACT.name}</span>
          <span className="hidden sm:flex items-center gap-1.5"><Phone size={14} />Hotline: {CONTACT.hotline}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {isAuthenticated && user ? (
            <Link to={homePathFor(user.role)} className="text-red-50 hover:text-white">Vào trang của tôi</Link>
          ) : (
            <>
              <Link to="/login" className="text-red-50 hover:text-white">Đăng nhập</Link>
              <Link to="/login" className="text-red-50 hover:text-white hidden sm:inline">Quản trị</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function usePlayerNavigation() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  return (path: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: path } } });
      return;
    }

    if (user?.role === 'PLAYER') {
      navigate(path);
      return;
    }

    if (user) navigate(homePathFor(user.role));
  };
}

function NavBar() {
  const [open, setOpen] = useState(false);
  const navigateToPlayer = usePlayerNavigation();

  const handleNav = (item: (typeof NAV)[number]) => {
    setOpen(false);
    if (item.feature === 'booking' || item.feature === 'schedule' || item.feature === 'facilities') {
      navigateToPlayer(item.feature === 'schedule' ? '/player/my-bookings' : '/player/booking');
      return;
    }
    if (item.feature) notifyComingSoon(item.feature);
  };

  const linkClass = 'px-3 py-2 rounded-md text-[15px] text-text hover:text-primary whitespace-nowrap';

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a href="#top" className="shrink-0">
          <Brand />
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href} className={linkClass}>{item.label}</a>
            ) : (
              <button key={item.label} type="button" onClick={() => handleNav(item)} className={linkClass}>
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigateToPlayer('/player/booking')} className="btn btn-primary px-5 py-2.5 font-semibold shadow-md">
            Đặt sân ngay
          </button>
          <button
            type="button"
            className="lg:hidden btn border border-border px-3 py-2.5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-border px-4 py-2 flex flex-col">
          {NAV.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href} onClick={() => setOpen(false)} className={linkClass}>{item.label}</a>
            ) : (
              <button key={item.label} type="button" onClick={() => handleNav(item)} className={`${linkClass} text-left`}>
                {item.label}
              </button>
            )
          )}
        </nav>
      )}
    </header>
  );
}

function QuickSearch() {
  const navigateToPlayer = usePlayerNavigation();
  const [sportId, setSportId] = useState(String(SPORTS[0].id));
  const [facilityId, setFacilityId] = useState(String(FACILITIES[0].id));
  const [date, setDate] = useState(TODAY);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const filters = new URLSearchParams({ date, sportId, facilityId });
    navigateToPlayer(`/player/booking?${filters.toString()}`);
  };

  const fieldClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600';

  return (
    <form onSubmit={handleSubmit} className="bg-white text-gray-900 rounded-3xl shadow-2xl p-7 space-y-4 w-full max-w-md">
      <div>
        <h2 className="text-xl font-bold">Tìm sân nhanh</h2>
        <p className="text-sm text-gray-500">Chọn môn, cơ sở, ngày — xem sân trống ngay</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Môn thể thao</span>
        <select value={sportId} onChange={(e) => setSportId(e.target.value)} className={fieldClass}>
          {SPORTS.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Cơ sở</span>
        <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={fieldClass}>
          {FACILITIES.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Ngày chơi</span>
        <input type="date" value={date} min={TODAY} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </label>
      <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-semibold shadow-lg">
        <Search size={18} /> Tìm sân ngay
      </button>
    </form>
  );
}

function Hero() {
  const navigateToPlayer = usePlayerNavigation();

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
            <button type="button" onClick={() => navigateToPlayer('/player/booking')} className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-red-700 hover:bg-red-800 font-semibold shadow-lg">
              <Search size={18} /> Tìm sân trống
            </button>
            <button type="button" onClick={() => navigateToPlayer('/player/booking')} className="px-7 py-3.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 font-semibold">
              Xem tất cả sân
            </button>
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
  const navigateToPlayer = usePlayerNavigation();

  return (
    <div id="top" className="min-h-screen bg-background text-text">
      <TopBar />
      <NavBar />
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
                <button type="button" onClick={() => s.feature === 'booking' ? navigateToPlayer('/player/booking') : notifyComingSoon(s.feature)} className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary text-left hover:gap-2 transition-all">
                  Xem chi tiết <ArrowRight size={16} />
                </button>
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

      <footer id="lien-he" className="bg-[#2a0707] text-red-50/85 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-3"><Brand light /></div>
            <p className="text-sm">Hệ thống quản lý và đặt sân cho chuỗi cụm sân thể thao đa cơ sở.</p>
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-white mb-2">Liên hệ</p>
            <p className="flex items-center gap-2"><Phone size={15} />Hotline: {CONTACT.hotline}</p>
            <p className="flex items-center gap-2"><Mail size={15} />Email: {CONTACT.email}</p>
            <p className="flex items-center gap-2"><Clock size={15} />Mở cửa: 06:00 – 23:00 hằng ngày</p>
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-white mb-2">Tài khoản</p>
            <Link to="/register" className="block text-red-50/85 hover:text-white">Đăng ký người chơi</Link>
            <Link to="/login" className="block text-red-50/85 hover:text-white">Đăng nhập</Link>
          </div>
        </div>
        <p className="text-center text-xs text-red-100/60 pb-6">© {CURRENT_YEAR} SportHub · Đồ án Nhóm 11</p>
      </footer>
    </div>
  );
}
