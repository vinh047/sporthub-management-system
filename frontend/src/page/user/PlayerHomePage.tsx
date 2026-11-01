import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/authApi';
import type { MeResponse } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import { notifyComingSoon, ownerOf } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

const TIER_LABEL: Record<string, string> = {
  Bronze: 'Đồng', Silver: 'Bạc', Gold: 'Vàng', Platinum: 'Kim Cương',
};

// Ngưỡng điểm lên hạng theo SRS mục 3.6
const NEXT_TIER: Record<string, { name: string; points: number } | null> = {
  Bronze: { name: 'Bạc', points: 500 },
  Silver: { name: 'Vàng', points: 1500 },
  Gold: { name: 'Kim Cương', points: 3000 },
  Platinum: null,
};

const ACTIONS: { title: string; description: string; feature: FeatureKey }[] = [
  { title: 'Đặt sân', description: 'Xem lịch trống, giữ chỗ 10 phút và thanh toán VietQR.', feature: 'booking' },
  { title: 'Buổi chơi Social', description: 'Mua vé tham gia buổi giao lưu hợp trình độ.', feature: 'social' },
  { title: 'Giải đấu', description: 'Đăng ký đội và theo dõi nhánh đấu trực tiếp.', feature: 'tournaments' },
  { title: 'Lịch sử đặt sân', description: 'Xem lại đơn đã đặt, hủy và hoàn tiền.', feature: 'myBookings' },
  { title: 'Ví voucher', description: 'Voucher còn dùng được và lịch sử tích điểm.', feature: 'vouchers' },
  { title: 'Hồ sơ thể thao', description: 'Lịch sử uy tín và biến động trình độ.', feature: 'sportProfile' },
];

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

  if (loading) return <p className="text-muted">Đang tải...</p>;
  if (!me) return <p className="text-muted">Không tải được thông tin tài khoản.</p>;

  const p = me.player;
  const next = p ? NEXT_TIER[p.tier] : null;
  const reputationLow = p && p.reputationScore < 60;

  return (
    <div className="space-y-6 animate-fade-in">
      <section>
        <h1 className="text-2xl font-bold">Xin chào, {me.fullName}</h1>
        <p className="text-muted">Hôm nay bạn muốn chơi gì?</p>
      </section>

      {p && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-muted">Điểm uy tín</p>
            <p className={`text-3xl font-bold ${reputationLow ? 'text-red-600' : 'text-emerald-600'}`}>{p.reputationScore}</p>
            <p className="text-xs text-muted mt-1">
              {reputationLow ? 'Dưới 60: tạm khóa mua vé Social và đăng ký giải' : 'Đủ điều kiện tham gia mọi hoạt động'}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-muted">Trình độ</p>
            <p className="text-3xl font-bold">{p.skillRating.toFixed(2)}</p>
            <p className="text-xs text-muted mt-1">{p.skillLevel} · {p.totalMatchesPlayed} trận đã chơi</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-muted">Hạng thành viên</p>
            <p className="text-3xl font-bold">{TIER_LABEL[p.tier] ?? p.tier}</p>
            <p className="text-xs text-muted mt-1">
              {next ? `Còn ${Math.max(next.points - p.loyaltyPoints, 0)} điểm để lên hạng ${next.name}` : 'Hạng cao nhất'}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-muted">Điểm tích lũy</p>
            <p className="text-3xl font-bold">{p.loyaltyPoints}</p>
            <p className="text-xs text-muted mt-1">10.000đ thanh toán = 1 điểm</p>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Bắt đầu</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a) => (
            <button
              key={a.title}
              type="button"
              onClick={() => notifyComingSoon(a.feature)}
              className="bg-surface border border-border rounded-xl p-5 flex flex-col text-left hover:border-primary"
            >
              <h3 className="font-semibold mb-1">{a.title}</h3>
              <p className="text-sm text-muted flex-1">{a.description}</p>
              <span className="mt-3 text-xs text-muted">Sắp có · {ownerOf(a.feature)} đang làm</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
