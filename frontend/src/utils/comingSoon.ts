import { createElement } from 'react';
import toast from 'react-hot-toast';
import { Construction } from 'lucide-react';

const MEMBERS = {
  TV1: 'Nguyễn Đức Vinh',
  TV2: 'Trương Công Nhật Sang',
  TV3: 'Hoàng Vũ',
  TV4: 'Nguyễn Trung Trực',
  TV5: 'Nguyễn Việt Hoàng',
} as const;

type Member = keyof typeof MEMBERS;

/**
 * Danh sách chức năng chưa làm, dùng cho mọi nút "sắp có".
 * Ai làm xong chức năng nào thì đổi nút đó sang link thật và xóa dòng tương ứng ở đây.
 */
export const FEATURES = {
  booking: { name: 'Đặt sân online (giữ chỗ 10 phút)', owner: 'TV1', uc: 'UC08' },
  schedule: { name: 'Lịch sân theo thời gian thực', owner: 'TV1', uc: 'UC07' },
  myBookings: { name: 'Lịch sử đặt sân, hủy và hoàn tiền', owner: 'TV1', uc: 'UC13' },
  social: { name: 'Buổi chơi Social', owner: 'TV4', uc: 'UC14–UC17' },
  socialCheckin: { name: 'Điểm danh khách Social', owner: 'TV4', uc: 'UC16' },
  sportProfile: { name: 'Hồ sơ thể thao (uy tín, trình độ AI)', owner: 'TV4', uc: 'UC25, UC27' },
  tournaments: { name: 'Giải đấu', owner: 'TV5', uc: 'UC18–UC21' },
  tournamentManage: { name: 'Quản lý giải, sinh nhánh đấu, nhập tỉ số', owner: 'TV5', uc: 'UC18, UC20, UC21' },
  payment: { name: 'Thanh toán VietQR', owner: 'TV5', uc: 'UC28' },
  reports: { name: 'Báo cáo doanh thu và tỷ lệ lấp đầy', owner: 'TV5', uc: 'UC26' },
  profile: { name: 'Hồ sơ cá nhân, đổi mật khẩu', owner: 'TV2', uc: 'UC01, UC02' },
  staffManage: { name: 'Nhân viên và phân quyền', owner: 'TV2', uc: 'UC03' },
  players: { name: 'Quản lý người chơi', owner: 'TV2', uc: 'UC02' },
  notifications: { name: 'Thông báo và CRM tự động', owner: 'TV2', uc: 'UC24' },
} as const satisfies Record<string, { name: string; owner: Member; uc: string }>;

export type FeatureKey = keyof typeof FEATURES;

/** Hiện thông báo: chức năng này chưa làm, ai đang phụ trách */
export function notifyComingSoon(key: FeatureKey) {
  const f = FEATURES[key];
  toast(`${f.name} đang được làm\nPhụ trách: ${f.owner} – ${MEMBERS[f.owner]} (${f.uc})`, {
    id: `soon-${key}`,
    icon: createElement(Construction, { size: 20, className: 'text-amber-500 shrink-0' }),
    duration: 4000,
    style: { whiteSpace: 'pre-line' },
  });
}

/** Chữ ngắn gọn để hiện cạnh nút, ví dụ "TV3" */
export const ownerOf = (key: FeatureKey) => FEATURES[key].owner;
