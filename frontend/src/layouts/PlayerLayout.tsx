import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Mỗi người thêm mục menu người chơi của mình vào đây (soon = trang chưa làm)
const MENU: { to: string; label: string; soon?: boolean }[] = [
  { to: '/player', label: 'Trang chủ' },
  { to: '/player/booking', label: 'Đặt sân', soon: true },
  { to: '/player/social', label: 'Social', soon: true },
  { to: '/player/tournaments', label: 'Giải đấu', soon: true },
  { to: '/player/profile', label: 'Hồ sơ', soon: true },
];

export default function PlayerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <NavLink to="/player" className="text-xl font-bold text-primary shrink-0">SportHub</NavLink>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {MENU.map((m) =>
              m.soon ? (
                <span key={m.to} className="px-3 py-1.5 text-sm text-muted whitespace-nowrap" title="Sắp có">
                  {m.label}
                </span>
              ) : (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                      isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'
                    }`
                  }
                >
                  {m.label}
                </NavLink>
              )
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <span className="text-muted hidden sm:inline">{user?.fullName}</span>
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
