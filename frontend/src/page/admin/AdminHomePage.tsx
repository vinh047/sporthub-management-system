import { useState } from 'react';
import { Link } from 'react-router-dom';
import SystemStatus from '../../components/SystemStatus';
import TodayStats from '../../components/TodayStats';
import { notifyComingSoon, ownerOf } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

// Các phân hệ quản trị; có "feature" = chưa làm, bấm hiện người phụ trách
const MODULES: { title: string; description: string; to?: string; feature?: FeatureKey }[] = [
  { title: 'Lễ tân / Check-in', description: 'Khách đặt sân hôm nay, check-in tại quầy', to: '/admin/reception' },
  { title: 'Bán sân tại quầy', description: 'Đặt sân nhanh cho khách vãng lai', to: '/admin/pos' },
  { title: 'Cơ sở & sân', description: 'Thêm, sửa, ngừng hoạt động cơ sở và sân con', feature: 'facilities' },
  { title: 'Bảng giá', description: 'Giá giờ thường, cao điểm, phụ thu cuối tuần', feature: 'pricing' },
  { title: 'Khóa sân bảo trì', description: 'Khóa sân, báo đơn bị ảnh hưởng', feature: 'maintenance' },
  { title: 'Khuyến mãi', description: 'Mã giảm giá, voucher giờ thấp điểm', feature: 'promotions' },
  { title: 'Nhân viên & phân quyền', description: 'Gán chi nhánh, cấp hoặc tước quyền', feature: 'staffManage' },
  { title: 'Người chơi', description: 'Tìm kiếm, khóa hoặc mở khóa tài khoản', feature: 'players' },
  { title: 'Buổi chơi Social', description: 'Tạo buổi, bán vé, điểm danh', feature: 'social' },
  { title: 'Giải đấu', description: 'Tạo giải, sinh nhánh đấu, nhập tỉ số', feature: 'tournamentManage' },
  { title: 'Báo cáo', description: 'Doanh thu, tỷ lệ lấp đầy sân', feature: 'reports' },
  { title: 'Thông báo & CRM', description: 'Mẫu thông báo, tặng voucher tự động', feature: 'notifications' },
];

/** Màn hình tổng quan của quản trị viên */
export default function AdminHomePage() {
  const [facilityId, setFacilityId] = useState(1);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Hôm nay</h2>
          <label className="text-sm">
            Cơ sở{' '}
            <input
              type="number"
              min={1}
              value={facilityId}
              onChange={(e) => setFacilityId(Number(e.target.value) || 1)}
              className="w-20 ml-1 px-2 py-1 border border-border rounded bg-background"
            />
          </label>
        </div>
        <TodayStats facilityId={facilityId} showUpcoming={false} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Phân hệ quản trị</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) =>
            m.to ? (
              <Link key={m.title} to={m.to} className="bg-surface border border-border rounded-xl p-5 hover:border-primary text-text">
                <h3 className="font-semibold mb-1">{m.title}</h3>
                <p className="text-sm text-muted">{m.description}</p>
              </Link>
            ) : (
              <button
                key={m.title}
                type="button"
                onClick={() => m.feature && notifyComingSoon(m.feature)}
                className="bg-surface border border-dashed border-border rounded-xl p-5 text-left hover:border-primary"
              >
                <h3 className="font-semibold mb-1">{m.title}</h3>
                <p className="text-sm text-muted">{m.description}</p>
                <p className="text-xs text-muted mt-2">Sắp có · {m.feature && ownerOf(m.feature)}</p>
              </button>
            )
          )}
        </div>
      </section>

      <SystemStatus />
    </div>
  );
}
