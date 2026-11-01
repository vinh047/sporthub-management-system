import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Role = 'ADMIN' | 'STAFF' | 'PLAYER';

// Mỗi người thêm mục menu của mình vào đây
const MENU: { to: string; label: string; roles: Role[] }[] = [
  { to: '/admin', label: 'Tổng quan', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/reception', label: 'Lễ tân / Check-in', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/pos', label: 'Bán sân tại quầy', roles: ['ADMIN', 'STAFF'] },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const items = MENU.filter((m) => user && m.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface hidden md:flex flex-col">
        <div className="px-5 py-4 text-xl font-bold text-primary">SportHub Admin</div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/admin'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm ${
                  isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'
                }`
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <span className="font-semibold">Quản trị</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user?.fullName} · {user?.role}
            </span>
            <button className="btn border border-border text-sm" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
