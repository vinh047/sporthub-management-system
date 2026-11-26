import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { socialAttendanceApi } from '../../api/socialAttendanceApi';
import type { SocialAttendance, SocialAttendee } from '../../api/socialAttendanceApi';
import { socialError } from '../../api/socialApi';
import { ticketStatus } from '../../api/socialTicketApi';
import { ErrorPanel, inputClass, money, primaryClass, secondaryClass } from './SocialShared';
const localTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function SocialAttendancePanel({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [data, setData] = useState<SocialAttendance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [confirm, setConfirm] = useState<SocialAttendee | null>(null);
  const reload = () => setVersion(v => v + 1);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError('');
    socialAttendanceApi.list(sessionId, abort.signal).then(r => { if (!abort.signal.aborted) setData(r); })
      .catch(e => { if (!abort.signal.aborted) setError(socialError(e)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [sessionId, version]);
  const checkIn = async () => {
    if (!confirm || busy) return;
    setBusy(true); setError('');
    try { await socialAttendanceApi.checkIn(sessionId, confirm.id); toast.success('Check-in thành công.'); setConfirm(null); reload(); }
    catch (e) { setError(socialError(e)); setConfirm(null); reload(); toast.error(socialError(e)); }
    finally { setBusy(false); }
  };
  const participants = data?.participants ?? [];
  const q = query.trim().toLocaleLowerCase('vi-VN');
  const visible = participants.filter(p => (!filter || p.status === filter) && (!q || p.fullName.toLocaleLowerCase('vi-VN').includes(q) || String(p.id).includes(q)));
  return <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">Check-in Social</h3><p className="text-sm text-gray-500">{data?.title ?? `Buổi #${sessionId}`}</p></div><div className="flex gap-2"><button type="button" className={secondaryClass} disabled={busy || loading} onClick={reload}>Làm mới</button><button type="button" className={secondaryClass} disabled={busy} onClick={onClose}>Đóng</button></div></div>
    {data && <p className="rounded-xl bg-gray-50 p-3 text-sm">Khung giờ: {localTime(data.opensAtUtc)} – {localTime(data.closesAtUtc)} (giờ Việt Nam). Chỉ vé đã xác nhận mới được check-in. Làm mới danh sách để cập nhật quyền check-in theo thời gian.</p>}
    <div className="grid grid-cols-3 gap-2">{[['Chờ check-in','Confirmed'],['Đã check-in','CheckedIn'],['Vắng mặt','NoShow']].map(([label,status]) => <div key={status} className="rounded-xl border p-3"><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-red-700">{participants.filter(p => p.status === status).length}</p></div>)}</div>
    <div className="grid gap-2 sm:grid-cols-2"><input className={inputClass} aria-label="Tìm người tham gia" placeholder="Tên hoặc mã vé" value={query} onChange={e => setQuery(e.target.value)} /><select className={inputClass} aria-label="Lọc vé" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{Array.from(new Set(participants.map(p => p.status))).map(s => <option key={s} value={s}>{ticketStatus(s)}</option>)}</select></div>
    {error && <ErrorPanel message={error} retry={reload} />}
    {confirm && <div role="alertdialog" aria-label="Xác nhận check-in" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p>Xác nhận có mặt: <strong>{confirm.fullName}</strong> (vé #{confirm.id})?</p><div className="flex gap-2"><button type="button" className={primaryClass} disabled={busy} onClick={checkIn}>{busy ? 'Đang xác nhận...' : 'Xác nhận check-in'}</button><button type="button" className={secondaryClass} disabled={busy} onClick={() => setConfirm(null)}>Quay lại</button></div></div>}
    {loading ? <p role="status">Đang tải danh sách...</p> : !error && (!visible.length ? <p className="py-6 text-center text-gray-500">Chưa có người tham gia phù hợp.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Mã vé</th><th className="p-3">Người chơi</th><th className="p-3">Đã trả</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead><tbody className="divide-y">{visible.map(p => <tr key={p.id}><td className="p-3">#{p.id}</td><td className="p-3 font-semibold">{p.fullName}</td><td className="p-3 whitespace-nowrap">{money(p.paidAmount)}</td><td className="p-3">{ticketStatus(p.status)}</td><td className="p-3"><button type="button" className={primaryClass} disabled={!p.canCheckIn || busy || !!confirm} onClick={() => setConfirm(p)}>{p.status === 'CheckedIn' ? 'Đã check-in' : 'Check-in'}</button></td></tr>)}</tbody></table></div>)}
  </section>;
}
