import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign, Building, CalendarDays, ChartColumn, ClipboardCheck, LayoutDashboard, Megaphone,
  ScanLine, Store, Swords, Trophy, UserCog, Users, Wrench,
} from 'lucide-react';
import Brand from '../components/Brand';
import UserMenu from '../components/UserMenu';
import { notifyComingSoon, ownerOf } from '../utils/comingSoon';
import type { FeatureKey } from '../utils/comingSoon';

type Area = 'staff' | 'admin';
type MenuItem = { to: string; label: string; icon: LucideIcon; feature?: FeatureKey };
type MenuGroup = { title: string; items: MenuItem[] };

// Mỗi người thêm mục menu của mình vào đây.
// Có "feature" = trang chưa làm: bấm sẽ hiện người phụ trách. Làm xong thì xóa "feature" và thêm route.
const MENUS: Record<Area, MenuGroup[]> = {
  staff: [
    {
      title: 'Ca làm',
      items: [
        { to: '/staff', label: 'Tổng quan ca làm', icon: LayoutDashboard },
        { to: '/staff/reception', label: 'Lễ tân / Check-in', icon: ScanLine },
        { to: '/staff/pos', label: 'Bán sân tại quầy', icon: Store },
        { to: '/staff/schedule', label: 'Lịch sân hôm nay', icon: CalendarDays, feature: 'schedule' },
      ],
    },
    {
      title: 'Vận hành',
      items: [
        { to: '/staff/maintenance', label: 'Khóa sân bảo trì', icon: Wrench },
        { to: '/staff/social', label: 'Điểm danh Social', icon: ClipboardCheck, feature: 'socialCheckin' },
        { to: '/staff/tournaments', label: 'Quản lý giải đấu', icon: Swords },
      ],
    },
  ],
  admin: [
    {
      title: 'Tổng quan',
      items: [
        { to: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard },
        { to: '/admin/reports', label: 'Báo cáo', icon: ChartColumn },
      ],
    },
    {
      title: 'Vận hành',
      items: [
        { to: '/admin/reception', label: 'Lễ tân / Check-in', icon: ScanLine },
        { to: '/admin/pos', label: 'Bán sân tại quầy', icon: Store },
        { to: '/admin/maintenance', label: 'Khóa sân bảo trì', icon: Wrench },
      ],
    },
    {
      title: 'Danh mục',
      items: [
        { to: '/admin/facilities', label: 'Cơ sở & sân', icon: Building },
        { to: '/admin/pricing', label: 'Bảng giá', icon: BadgeDollarSign },
        { to: '/admin/promotions', label: 'Khuyến mãi', icon: Megaphone },
      ],
    },
    {
      title: 'Hoạt động',
      items: [
        { to: '/admin/social', label: 'Buổi chơi Social', icon: Users, feature: 'social' },
        { to: '/admin/tournaments', label: 'Giải đấu', icon: Trophy },
      ],
    },
    {
      title: 'Tài khoản',
      items: [
        { to: '/admin/staff', label: 'Nhân viên & phân quyền', icon: UserCog, feature: 'staffManage' },
        { to: '/admin/players', label: 'Người chơi', icon: Users, feature: 'players' },
      ],
    },
  ],
};

const SUBTITLE: Record<Area, string> = { staff: 'Khu vực nhân viên', admin: 'Khu vực quản trị' };

/** Khung trang cho nhân viên (/staff) và quản trị (/admin) */
export default function AdminLayout({ area }: { area: Area }) {
  const { pathname } = useLocation();
  const allItems = MENUS[area].flatMap((g) => g.items);
  const current = allItems.find((m) => !m.feature && m.to === pathname) ?? allItems[0];

  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-gray-100 bg-white hidden md:flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-gray-100">
          <Brand size="sm" />
        </div>
        <p className="px-5 pt-4 text-xs font-medium text-gray-400">{SUBTITLE[area]}</p>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {MENUS[area].map((group) => (
            <div key={group.title} className="mt-4">
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((m) => <SideItem key={m.to} item={m} area={area} />)}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="sticky top-0 z-20 h-16 border-b border-gray-100 bg-white/90 backdrop-blur flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="md:hidden"><Brand size="sm" /></span>
            <h1 className="hidden md:block text-lg font-semibold truncate">{current.label}</h1>
          </div>
          <UserMenu />
        </header>
        {/* Menu cuộn ngang cho màn hình nhỏ */}
        <nav className="md:hidden flex gap-1 overflow-x-auto [scrollbar-width:none] border-b border-gray-100 bg-white px-2 py-2">
          {allItems.map((m) => <SideItem key={m.to} item={m} area={area} compact />)}
        </nav>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideItem({ item, area, compact = false }: { item: MenuItem; area: Area; compact?: boolean }) {
  const { to, label, icon: Icon, feature } = item;
  const base = `flex items-center gap-3 rounded-xl text-sm font-medium transition ${compact ? 'px-3 py-1.5 whitespace-nowrap' : 'px-3 py-2.5 w-full'}`;

  if (feature) {
    return (
      <button
        type="button"
        onClick={() => notifyComingSoon(feature)}
        className={`${base} text-gray-500 hover:bg-gray-50 hover:text-gray-800 text-left`}
        title="Chưa làm – bấm để xem ai phụ trách"
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1">{label}</span>
        {!compact && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{ownerOf(feature)}</span>}
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      end={to === `/${area}`}
      className={({ isActive }) =>
        `${base} ${isActive ? 'bg-red-50 text-red-700 shadow-[inset_3px_0_0_0] shadow-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
      }
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1">{label}</span>
    </NavLink>
  );
}
