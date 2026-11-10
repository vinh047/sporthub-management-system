import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, CircleAlert, ClipboardCheck, ScanLine, Store, Swords, Wrench } from 'lucide-react';
import TodayStats from '../../components/TodayStats';
import { useAuthStore } from '../../store/authStore';
import { notifyComingSoon, ownerOf } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

// Lối tắt của nhân viên; có "feature" = chưa làm, bấm hiện người phụ trách
const ACTIONS: { label: string; description: string; icon: LucideIcon; to?: string; feature?: FeatureKey }[] = [
  { label: 'Check-in khách', description: 'Tra mã đơn hoặc SĐT, xác nhận khách đến', icon: ScanLine, to: '/staff/reception' },
  { label: 'Bán sân tại quầy', description: 'Đặt nhanh cho khách vãng lai', icon: Store, to: '/staff/pos' },
  { label: 'Lịch sân hôm nay', description: 'Ma trận sân × khung giờ', icon: CalendarDays, feature: 'schedule' },
  { label: 'Khóa sân bảo trì', description: 'Khóa sân theo ngày và khung giờ', icon: Wrench, to: '/staff/maintenance' },
  { label: 'Điểm danh Social', description: 'Check-in người tham gia buổi Social', icon: ClipboardCheck, feature: 'socialCheckin' },
  { label: 'Quản lý giải đấu', description: 'Tạo giải đấu, xem danh sách đội đăng ký', icon: Swords, to: '/staff/tournaments' },
];

/** Màn hình chính của nhân viên: số liệu ca làm hôm nay và lối tắt */
export default function StaffHomePage() {
  const user = useAuthStore((s) => s.user);
  const facilityId = user?.facilityId ?? null;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 capitalize">{TODAY_LABEL}</p>
          <h2 className="text-2xl font-bold">Chào {user?.fullName}, chúc ca làm suôn sẻ!</h2>
        </div>
        {facilityId && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">Cơ sở #{facilityId}</span>
        )}
      </section>

      {facilityId ? (
        <TodayStats facilityId={facilityId} />
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <CircleAlert size={20} className="shrink-0" />
          Tài khoản chưa được phân công cơ sở. Nhờ quản trị viên gán cơ sở để xem số liệu và check-in khách.
        </div>
      )}

      <section>
        <h3 className="mb-4 text-lg font-bold">Lối tắt</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a) => <ActionTile key={a.label} {...a} />)}
        </div>
      </section>
    </div>
  );
}

function ActionTile({ label, description, icon: Icon, to, feature }: (typeof ACTIONS)[number]) {
  const inner = (
    <>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${feature ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>
        <Icon size={22} />
      </span>
      <span className="flex-1 text-left">
        <span className="flex items-center justify-between font-semibold text-gray-900">
          {label} <ArrowRight size={16} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
        </span>
        <span className="mt-0.5 block text-sm text-gray-500">{description}</span>
        {feature && <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Sắp có · {ownerOf(feature)}</span>}
      </span>
    </>
  );
  const cls = 'group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md';
  return feature
    ? <button type="button" onClick={() => notifyComingSoon(feature)} className={cls}>{inner}</button>
    : <Link to={to ?? '#'} className={cls}>{inner}</Link>;
}
