import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { notifyComingSoon, ownerOf } from '../utils/comingSoon';
import type { FeatureKey } from '../utils/comingSoon';

type Area = 'staff' | 'admin';
type MenuItem = { to: string; label: string; feature?: FeatureKey };

// Mỗi người thêm mục menu của mình vào đây.
// Có "feature" = trang chưa làm: bấm sẽ hiện người phụ trách. Làm xong thì xóa "feature" và thêm route.
const MENUS: Record<Area, MenuItem[]> = {
  staff: [
    { to: '/staff', label: 'Tổng quan ca làm' },
    { to: '/staff/reception', label: 'Lễ tân / Check-in' },
    { to: '/staff/pos', label: 'Bán sân tại quầy' },
    { to: '/staff/schedule', label: 'Lịch sân hôm nay', feature: 'schedule' },
    { to: '/staff/maintenance', label: 'Khóa sân bảo trì', feature: 'maintenance' },
    { to: '/staff/social', label: 'Điểm danh Social', feature: 'socialCheckin' },
    { to: '/staff/tournaments', label: 'Nhập tỉ số giải đấu', feature: 'tournamentManage' },
  ],
  admin: [
    { to: '/admin', label: 'Tổng quan' },
    { to: '/admin/reception', label: 'Lễ tân / Check-in' },
    { to: '/admin/pos', label: 'Bán sân tại quầy' },
    { to: '/admin/facilities', label: 'Cơ sở & sân', feature: 'facilities' },
    { to: '/admin/pricing', label: 'Bảng giá', feature: 'pricing' },
    { to: '/admin/maintenance', label: 'Khóa sân bảo trì', feature: 'maintenance' },
    { to: '/admin/promotions', label: 'Khuyến mãi', feature: 'promotions' },
    { to: '/admin/staff', label: 'Nhân viên & phân quyền', feature: 'staffManage' },
    { to: '/admin/players', label: 'Người chơi', feature: 'players' },
    { to: '/admin/social', label: 'Buổi chơi Social', feature: 'social' },
    { to: '/admin/tournaments', label: 'Giải đấu', feature: 'tournamentManage' },
    { to: '/admin/reports', label: 'Báo cáo', feature: 'reports' },
  ],
};

const TITLES: Record<Area, string> = { staff: 'SportHub Staff', admin: 'SportHub Admin' };

/** Khung trang cho nhân viên (/staff) và quản trị (/admin) */
export default function AdminLayout({ area }: { area: Area }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderItem = (m: MenuItem, compact: boolean) => {
    const base = compact ? 'px-3 py-1.5 rounded-md text-sm whitespace-nowrap' : 'px-3 py-2 rounded-md text-sm';
    if (m.feature) {
      const feature = m.feature;
      return (
        <button
          key={m.to}
          type="button"
          onClick={() => notifyComingSoon(feature)}
          className={`${base} ${compact ? '' : 'w-full flex justify-between'} text-muted hover:bg-background text-left`}
          title="Chưa làm – bấm để xem ai phụ trách"
        >
          {m.label}
          {!compact && <span className="text-xs">{ownerOf(feature)}</span>}
        </button>
      );
    }
    return (
      <NavLink
        key={m.to}
        to={m.to}
        end={m.to === `/${area}`}
        className={({ isActive }) =>
          `${base} ${compact ? '' : 'block'} ${isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'}`
        }
      >
        {m.label}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen flex bg-background text-text">
      <aside className="w-64 shrink-0 border-r border-border bg-surface hidden md:flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary text-white font-bold grid place-items-center">S</span>
          <span className="text-lg font-bold text-primary">{TITLES[area]}</span>
        </div>
        <nav className="flex-1 px-3 space-y-1 pb-4">{MENUS[area].map((m) => renderItem(m, false))}</nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <span className="font-semibold">{area === 'admin' ? 'Quản trị' : 'Nhân viên'}</span>
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => notifyComingSoon('notifications')} className="btn border border-border text-sm" title="Thông báo">
              🔔
            </button>
            <span className="text-muted hidden sm:inline">
              {user?.fullName} · {user?.role}
            </span>
            <button className="btn border border-border text-sm" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>
        {/* Menu ngang cho màn hình nhỏ (sidebar bị ẩn) */}
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {MENUS[area].map((m) => renderItem(m, true))}
        </nav>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
