import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowRight, CalendarClock, CalendarDays, Coins, Crown, ReceiptText,
  ShieldCheck, Sparkles, TicketPercent, Trophy, UserRound, Users,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import type { MeResponse } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import { notifyComingSoon, ownerOf } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

const TIER_LABEL: Record<string, string> = { Bronze: 'Đồng', Silver: 'Bạc', Gold: 'Vàng', Platinum: 'Kim Cương' };

// Ngưỡng điểm từng hạng theo SRS mục 3.6
const TIERS = [
  { key: 'Bronze', min: 0 },
  { key: 'Silver', min: 500 },
  { key: 'Gold', min: 1500 },
  { key: 'Platinum', min: 3000 },
];

const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

const ACTIONS: { title: string; description: string; icon: LucideIcon; feature: FeatureKey; tint: string }[] = [
  { title: 'Đặt sân', description: 'Xem lịch trống, giữ chỗ 10 phút, thanh toán VietQR.', icon: CalendarDays, feature: 'booking', tint: 'bg-red-50 text-red-700' },
  { title: 'Buổi chơi Social', description: 'Mua vé buổi giao lưu hợp trình độ.', icon: Users, feature: 'social', tint: 'bg-amber-50 text-amber-600' },
  { title: 'Giải đấu', description: 'Đăng ký đội, theo dõi nhánh đấu trực tiếp.', icon: Trophy, feature: 'tournaments', tint: 'bg-emerald-50 text-emerald-600' },
  { title: 'Đơn của tôi', description: 'Xem lại đơn đã đặt, hủy và hoàn tiền.', icon: ReceiptText, feature: 'myBookings', tint: 'bg-blue-50 text-blue-600' },
  { title: 'Ví voucher', description: 'Voucher còn dùng được, lịch sử tích điểm.', icon: TicketPercent, feature: 'vouchers', tint: 'bg-purple-50 text-purple-600' },
  { title: 'Hồ sơ thể thao', description: 'Lịch sử uy tín và biến động trình độ.', icon: UserRound, feature: 'sportProfile', tint: 'bg-slate-100 text-slate-700' },
];

const card = 'rounded-2xl border border-gray-100 bg-white shadow-sm';

/** Trang chủ của người chơi sau khi đăng nhập */
export default function PlayerHomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((res) => active && setMe(res.data ?? null))
      .catch((err) => active && toast.error(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-gray-100" />)}
        </div>
      </div>
    );
  }
  if (!me) return <p className="text-gray-500">Không tải được thông tin tài khoản.</p>;

  const p = me.player;
  const tierIndex = p ? Math.max(TIERS.findIndex((t) => t.key === p.tier), 0) : 0;
  const nextTier = TIERS[tierIndex + 1];
  const tierProgress = p && nextTier
    ? Math.min(100, ((p.loyaltyPoints - TIERS[tierIndex].min) / (nextTier.min - TIERS[tierIndex].min)) * 100)
    : 100;
  const reputationLow = p ? p.reputationScore < 60 : false;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Lời chào */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-800 to-[#3d0b0b] p-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-red-100/90 capitalize">{TODAY_LABEL}</p>
            <h1 className="mt-1 text-3xl font-extrabold">Xin chào, {me.fullName}!</h1>
            <p className="mt-2 text-red-100/90">Hôm nay bạn muốn ra sân chơi gì?</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => notifyComingSoon('booking')} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-red-700 shadow hover:bg-red-50">
              <CalendarDays size={18} /> Đặt sân ngay
            </button>
            <button type="button" onClick={() => notifyComingSoon('social')} className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20">
              <Users size={18} /> Tìm buổi Social
            </button>
          </div>
        </div>
      </section>

      {/* Chỉ số */}
      {p && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShieldCheck} tint={reputationLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} label="Điểm uy tín" value={String(p.reputationScore)}>
            <Bar percent={p.reputationScore} color={reputationLow ? 'bg-red-500' : 'bg-emerald-500'} />
            <p className="mt-2 text-xs text-gray-500">
              {reputationLow ? 'Dưới 60: tạm khóa mua vé Social và đăng ký giải' : 'Đủ điều kiện tham gia mọi hoạt động'}
            </p>
          </StatCard>
          <StatCard icon={Activity} tint="bg-blue-50 text-blue-600" label="Trình độ" value={p.skillRating.toFixed(2)}>
            <p className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{p.skillLevel}</p>
            <p className="mt-2 text-xs text-gray-500">{p.totalMatchesPlayed} trận đã chơi</p>
          </StatCard>
          <StatCard icon={Crown} tint="bg-amber-50 text-amber-600" label="Hạng thành viên" value={TIER_LABEL[p.tier] ?? p.tier}>
            <Bar percent={tierProgress} color="bg-amber-500" />
            <p className="mt-2 text-xs text-gray-500">
              {nextTier ? `Còn ${Math.max(nextTier.min - p.loyaltyPoints, 0)} điểm để lên hạng ${TIER_LABEL[nextTier.key]}` : 'Bạn đang ở hạng cao nhất'}
            </p>
          </StatCard>
          <StatCard icon={Coins} tint="bg-purple-50 text-purple-600" label="Điểm tích lũy" value={p.loyaltyPoints.toLocaleString('vi-VN')}>
            <p className="mt-3 text-xs text-gray-500">10.000đ thanh toán = 1 điểm</p>
          </StatCard>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lối tắt */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Bắt đầu</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ACTIONS.map(({ title, description, icon: Icon, feature, tint }) => (
              <button
                key={title}
                type="button"
                onClick={() => notifyComingSoon(feature)}
                className={`${card} group flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md`}
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tint}`}><Icon size={22} /></span>
                <span className="flex-1">
                  <span className="flex items-center justify-between font-semibold">
                    {title}
                    <ArrowRight size={16} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">{description}</span>
                  <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Sắp có · {ownerOf(feature)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Cột phải */}
        <aside className="space-y-4">
          <h2 className="text-lg font-bold">Lịch của bạn</h2>
          <div className={`${card} p-6 text-center`}>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700"><CalendarClock size={26} /></span>
            <p className="mt-4 font-semibold">Chưa có lịch đặt sân sắp tới</p>
            <p className="mt-1 text-sm text-gray-500">Đặt sân để giữ chỗ khung giờ bạn thích.</p>
            <button type="button" onClick={() => notifyComingSoon('booking')} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
              Đặt sân
            </button>
          </div>
          <div className={`${card} flex items-start gap-3 p-5`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Sparkles size={20} /></span>
            <div>
              <p className="font-semibold">Ưu đãi thành viên</p>
              <p className="mt-1 text-sm text-gray-500">Hạng Bạc giảm 3%, Vàng 5%, Kim Cương 10% cho mọi đơn đặt sân.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tint, label, value, children }: { icon: LucideIcon; tint: string; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}><Icon size={20} /></span>
      </div>
      <p className="mt-1 text-3xl font-extrabold text-gray-900">{value}</p>
      {children}
    </div>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
