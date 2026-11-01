import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Area = 'staff' | 'admin';
type MenuItem = { to: string; label: string; soon?: string };

// Mỗi người thêm mục menu của mình vào đây; "soon" = trang chưa làm, ghi người phụ trách
const MENUS: Record<Area, MenuItem[]> = {
  staff: [
    { to: '/staff', label: 'Tổng quan ca làm' },
    { to: '/staff/reception', label: 'Lễ tân / Check-in' },
    { to: '/staff/pos', label: 'Bán sân tại quầy' },
    { to: '/staff/maintenance', label: 'Khóa sân bảo trì', soon: 'TV3' },
    { to: '/staff/social', label: 'Điểm danh Social', soon: 'TV4' },
  ],
  admin: [
    { to: '/admin', label: 'Tổng quan' },
    { to: '/admin/reception', label: 'Lễ tân / Check-in' },
    { to: '/admin/pos', label: 'Bán sân tại quầy' },
    { to: '/admin/facilities', label: 'Cơ sở & sân', soon: 'TV3' },
    { to: '/admin/pricing', label: 'Bảng giá', soon: 'TV3' },
    { to: '/admin/promotions', label: 'Khuyến mãi', soon: 'TV3' },
    { to: '/admin/staff', label: 'Nhân viên & phân quyền', soon: 'TV2' },
    { to: '/admin/players', label: 'Người chơi', soon: 'TV2' },
    { to: '/admin/tournaments', label: 'Giải đấu', soon: 'TV5' },
    { to: '/admin/reports', label: 'Báo cáo', soon: 'TV5' },
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

  return (
    <div className="min-h-screen flex bg-background text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface hidden md:flex flex-col">
        <div className="px-5 py-4 text-xl font-bold text-primary">{TITLES[area]}</div>
        <nav className="flex-1 px-3 space-y-1">
          {MENUS[area].map((m) =>
            m.soon ? (
              <span key={m.to} className="flex justify-between px-3 py-2 text-sm text-muted" title="Sắp có">
                {m.label} <span className="text-xs">{m.soon}</span>
              </span>
            ) : (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.to === `/${area}`}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm ${
                    isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'
                  }`
                }
              >
                {m.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <span className="font-semibold">{area === 'admin' ? 'Quản trị' : 'Nhân viên'}</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user?.fullName} · {user?.role}
            </span>
            <button className="btn border border-border text-sm" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>
        {/* Menu ngang cho màn hình nhỏ (sidebar bị ẩn) */}
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {MENUS[area].filter((m) => !m.soon).map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === `/${area}`}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${isActive ? 'bg-primary text-white' : 'text-text'}`
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
