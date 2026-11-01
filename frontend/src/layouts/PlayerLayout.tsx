import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { notifyComingSoon } from '../utils/comingSoon';
import type { FeatureKey } from '../utils/comingSoon';

// Mỗi người thêm mục menu người chơi của mình vào đây.
// Có "feature" = trang chưa làm: bấm sẽ hiện người phụ trách. Làm xong thì xóa "feature" và thêm route.
const MENU: { to: string; label: string; feature?: FeatureKey }[] = [
  { to: '/player', label: 'Trang chủ' },
  { to: '/player/booking', label: 'Đặt sân', feature: 'booking' },
  { to: '/player/my-bookings', label: 'Đơn của tôi', feature: 'myBookings' },
  { to: '/player/social', label: 'Social', feature: 'social' },
  { to: '/player/tournaments', label: 'Giải đấu', feature: 'tournaments' },
  { to: '/player/vouchers', label: 'Ưu đãi', feature: 'vouchers' },
  { to: '/player/profile', label: 'Hồ sơ', feature: 'profile' },
];

export default function PlayerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const itemClass = 'px-3 py-1.5 rounded-md text-sm whitespace-nowrap';

  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      <header className="border-b border-border bg-surface sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-primary text-white font-bold grid place-items-center">S</span>
            <span className="text-lg font-bold text-primary hidden sm:inline">SportHub</span>
          </NavLink>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {MENU.map((m) => {
              if (m.feature) {
                const feature = m.feature;
                return (
                  <button key={m.to} type="button" onClick={() => notifyComingSoon(feature)} className={`${itemClass} text-text hover:bg-background`}>
                    {m.label}
                  </button>
                );
              }
              return (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end
                  className={({ isActive }) =>
                    `${itemClass} ${isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'}`
                  }
                >
                  {m.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 text-sm shrink-0">
            <button type="button" onClick={() => notifyComingSoon('notifications')} className="btn border border-border text-sm" title="Thông báo">
              🔔
            </button>
            <span className="text-muted hidden md:inline">{user?.fullName}</span>
            <button className="btn border border-border text-sm" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
