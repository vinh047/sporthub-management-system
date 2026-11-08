import { useNavigate } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { notifyComingSoon } from '../utils/comingSoon';

const ROLE_LABEL = { ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', PLAYER: 'Người chơi' } as const;

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('');

/** Chuông thông báo + avatar + đăng xuất (dùng ở mọi layout sau đăng nhập) */
export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => notifyComingSoon('notifications')}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
      </button>
      <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white">
          {initials(user.fullName)}
        </span>
        <span className="hidden md:block leading-tight">
          <span className="block text-sm font-semibold text-gray-900">{user.fullName}</span>
          <span className="block text-xs text-gray-500">{ROLE_LABEL[user.role]}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="grid h-10 w-10 place-items-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-700"
        aria-label="Đăng xuất"
        title="Đăng xuất"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
