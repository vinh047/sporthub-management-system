import { NavLink, Outlet } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, House, ReceiptText, TicketPercent, Trophy, UserRound, Users } from 'lucide-react';
import Brand from '../components/Brand';
import UserMenu from '../components/UserMenu';
import { notifyComingSoon } from '../utils/comingSoon';
import type { FeatureKey } from '../utils/comingSoon';
import NotificationBell from '../components/NotificationBell';

// Mỗi người thêm mục menu người chơi của mình vào đây.
// Có "feature" = trang chưa làm: bấm sẽ hiện người phụ trách. Làm xong thì xóa "feature" và thêm route.
const MENU: { to: string; label: string; icon: LucideIcon; feature?: FeatureKey }[] = [
  { to: '/player', label: 'Trang chủ', icon: House },
  { to: '/player/booking', label: 'Đặt sân', icon: CalendarDays },
  { to: '/player/my-bookings', label: 'Đơn của tôi', icon: ReceiptText },
  { to: '/player/social', label: 'Social', icon: Users, feature: 'social' },
  { to: '/player/tournaments', label: 'Giải đấu', icon: Trophy },
  { to: '/player/vouchers', label: 'Ưu đãi', icon: TicketPercent },
];

const itemClass = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition';

export default function PlayerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur" >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4" >
                <NavLink to="/" className = "shrink-0" >
                    <Brand />
                    </NavLink>

                    < nav className = "hidden items-center gap-1 lg:flex" >
                    {
                        MENU.map((m) => (
                            <MenuItem key= { m.to } { ...m } />
            ))
                    }
                        </nav>

                        < div className = "flex shrink-0 items-center gap-3" >
                            <NotificationBell />
                            < UserMenu />
                            </div>
                            </div>

                            < nav className = "flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:hidden" >
                            {
                                MENU.map((m) => (
                                    <MenuItem key= { m.to } { ...m } />
        ))
                            }
                                </nav>
                                </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function MenuItem({ to, label, icon: Icon, feature }: (typeof MENU)[number]) {
  if (feature) {
    return (
      <button type="button" onClick={() => notifyComingSoon(feature)} className={`${itemClass} text-gray-600 hover:bg-gray-100 hover:text-gray-900`}>
        <Icon size={18} /> {label}
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `${itemClass} ${isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
      }
    >
      <Icon size={18} /> {label}
    </NavLink>
  );
}
