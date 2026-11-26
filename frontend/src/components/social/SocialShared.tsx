import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import type { SocialSession } from '../../api/socialApi';
export const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
export const primaryClass = 'rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryClass = 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';
export const money = (amount: number) => amount.toLocaleString('vi-VN') + ' đ';
export const dateLabel = (date: string) => date.split('-').reverse().join('/');
export const timeLabel = (time: string) => time.slice(0, 5);
export const statusLabel = (status: string) => ({ Published: 'Đang mở', Cancelled: 'Đã hủy', Completed: 'Đã kết thúc', Draft: 'Bản nháp' }[status] ?? status);
export const vietnamNow = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19);
export const isFuture = (s: SocialSession) => `${s.playDate}T${s.startTime.slice(0,8)}` > vietnamNow();
export function SessionFacts({ session: s, facilityName }: { session: SocialSession; facilityName: string }) {
  return <div className="space-y-2 text-sm text-gray-600">
    <div className="flex items-center gap-2"><MapPin size={16} className="shrink-0" />{facilityName}</div>
    <div className="flex items-center gap-2"><CalendarDays size={16} />{dateLabel(s.playDate)}</div>
    <div className="flex items-center gap-2"><Clock size={16} />{timeLabel(s.startTime)} – {timeLabel(s.endTime)}</div>
    <div className="flex items-center gap-2"><Users size={16} />{s.registeredCount}/{s.maxParticipants} người · Trình độ {s.minSkill}–{s.maxSkill}</div>
  </div>;
}
export function SlotMeter({ session: s }: { session: SocialSession }) {
  return <div className="space-y-2">
    <div className="flex justify-between gap-2 text-xs font-semibold"><span className={s.availableSlots > 0 ? 'text-emerald-700' : 'text-red-700'}>{s.availableSlots > 0 ? `Còn ${s.availableSlots} slot` : 'Hết slot'}</span><span className="text-gray-500">{s.maxParticipants} slot</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(100, Math.max(0, (s.maxParticipants - s.availableSlots) / Math.max(1, s.maxParticipants) * 100))}%` }} /></div>
  </div>;
}
export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}{retry && <button type="button" className="ml-3 font-semibold underline" onClick={retry}>Thử lại</button>}</div>;
}
