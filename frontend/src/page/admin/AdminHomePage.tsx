import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, BadgeDollarSign, Bell, Building, ChartColumn, Megaphone, ScanLine, Store,
  Trophy, UserCog, Users, Wrench,
} from 'lucide-react';
import SystemStatus from '../../components/SystemStatus';
import TodayStats from '../../components/TodayStats';
import { notifyComingSoon, ownerOf } from '../../utils/comingSoon';
import type { FeatureKey } from '../../utils/comingSoon';

const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

// Các phân hệ quản trị; có "feature" = chưa làm, bấm hiện người phụ trách
const MODULES: { title: string; description: string; icon: LucideIcon; to?: string; feature?: FeatureKey }[] = [
  { title: 'Lễ tân / Check-in', description: 'Khách đặt sân hôm nay, check-in tại quầy', icon: ScanLine, to: '/admin/reception' },
  { title: 'Bán sân tại quầy', description: 'Đặt sân nhanh cho khách vãng lai', icon: Store, to: '/admin/pos' },
  { title: 'Cơ sở & sân', description: 'Thêm, sửa, ngừng hoạt động cơ sở và sân con', icon: Building, to: '/admin/facilities' },
  { title: 'Bảng giá', description: 'Giá giờ thường, cao điểm, phụ thu cuối tuần', icon: BadgeDollarSign, to: '/admin/pricing' },
  { title: 'Khóa sân bảo trì', description: 'Khóa sân theo khung giờ và ngày bảo trì', icon: Wrench, to: '/admin/maintenance' },
  { title: 'Khuyến mãi', description: 'Tạo mã giảm giá, cấu hình voucher giờ thấp điểm', icon: Megaphone, to: '/admin/promotions' },
  { title: 'Nhân viên & phân quyền', description: 'Gán chi nhánh, cấp hoặc tước quyền', icon: UserCog, feature: 'staffManage' },
  { title: 'Người chơi', description: 'Tìm kiếm, khóa hoặc mở khóa tài khoản', icon: Users, feature: 'players' },
  { title: 'Buổi chơi Social', description: 'Tạo buổi, bán vé, điểm danh', icon: Users, feature: 'social' },
  { title: 'Giải đấu', description: 'Tạo giải, mở đăng ký đội, xem danh sách VĐV', icon: Trophy, to: '/admin/tournaments' },
  { title: 'Báo cáo', description: 'Doanh thu, tỷ lệ lấp đầy sân', icon: ChartColumn, to: '/admin/reports' },
  { title: 'Thông báo & CRM', description: 'Mẫu thông báo, tặng voucher tự động', icon: Bell, feature: 'notifications' },
];

/** Màn hình tổng quan của quản trị viên */
export default function AdminHomePage() {
  const [facilityId, setFacilityId] = useState(1);

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 capitalize">{TODAY_LABEL}</p>
          <h2 className="text-2xl font-bold">Tổng quan hệ thống</h2>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
          <Building size={16} className="text-gray-400" />
          Cơ sở
          <input
            type="number"
            min={1}
            value={facilityId}
            onChange={(e) => setFacilityId(Number(e.target.value) || 1)}
            className="w-14 rounded-md border border-gray-200 px-2 py-0.5 focus:border-red-600 focus:outline-none"
          />
        </label>
      </section>

      <TodayStats facilityId={facilityId} showUpcoming={false} />

      <section>
        <h3 className="mb-4 text-lg font-bold">Phân hệ quản trị</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((m) => <ModuleTile key={m.title} {...m} />)}
        </div>
      </section>

      <SystemStatus />
    </div>
  );
}

function ModuleTile({ title, description, icon: Icon, to, feature }: (typeof MODULES)[number]) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${feature ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-700'}`}>
          <Icon size={20} />
        </span>
        {feature
          ? <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Sắp có · {ownerOf(feature)}</span>
          : <ArrowRight size={18} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />}
      </div>
      <h4 className="mt-4 font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </>
  );
  const cls = 'group block rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md';
  return feature
    ? <button type="button" onClick={() => notifyComingSoon(feature)} className={cls}>{inner}</button>
    : <Link to={to ?? '#'} className={cls}>{inner}</Link>;
}
