import { Link } from 'react-router-dom';
import TodayStats from '../../components/TodayStats';
import { useAuthStore } from '../../store/authStore';

const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Màn hình chính của nhân viên: số liệu ca làm hôm nay và lối tắt */
export default function StaffHomePage() {
  const user = useAuthStore((s) => s.user);
  const facilityId = user?.facilityId ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <section>
        <h1 className="text-2xl font-bold">Ca làm hôm nay</h1>
        <p className="text-muted">
          <span className="capitalize">{TODAY_LABEL}</span>
          {facilityId ? ` · Cơ sở #${facilityId}` : ''}
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link to="/staff/reception" className="btn btn-primary px-5 py-2.5">Check-in khách</Link>
        <Link to="/staff/pos" className="btn px-5 py-2.5 border border-border bg-surface text-text">Bán sân tại quầy</Link>
      </section>

      {facilityId ? (
        <TodayStats facilityId={facilityId} />
      ) : (
        <p className="bg-surface border border-border rounded-xl p-5 text-sm text-amber-600">
          Tài khoản chưa được phân công cơ sở. Nhờ quản trị viên gán cơ sở để xem số liệu và check-in khách.
        </p>
      )}
    </div>
  );
}
