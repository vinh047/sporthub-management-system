import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { socialError } from '../../api/socialApi';
import type { SocialSession } from '../../api/socialApi';
import { socialTicketApi } from '../../api/socialTicketApi';
import type { SocialPaymentMethod } from '../../api/socialTicketApi';
import { ErrorPanel, inputClass, money, primaryClass } from './SocialShared';

export default function SocialReservePanel({session, canReserve}: {session: SocialSession; canReserve: boolean}) {
  const user = useAuthStore(s => s.user);
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();
  const [methods, setMethods] = useState<SocialPaymentMethod[]>([]);
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const lock = useRef(false);
  const player = authenticated && user?.role === 'PLAYER';
  const paid = session.feePerSlot > 0;
  useEffect(() => {
    if (!player || !paid || !canReserve) return;
    const ac = new AbortController();
    setLoading(true); setError(''); setMethods([]); setMethod('');
    socialTicketApi.methods(ac.signal).then(m => { if (!ac.signal.aborted) setMethods(m); })
      .catch(e => {if (!ac.signal.aborted) setError(socialError(e));})
      .finally(() => {if (!ac.signal.aborted) setLoading(false);});
    return () => ac.abort();
  }, [player, paid, canReserve, version, session.id]);
  async function reserve() {
    if (lock.current || !player || !canReserve || (paid && !methods.some(x => x.id === Number(method)))) return;
    if (!window.confirm(paid ? `Giữ 1 slot giá ${money(session.feePerSlot)}? Thanh toán sẽ được xác nhận bởi hệ thống.` : 'Xác nhận đăng ký 1 slot miễn phí?')) return;
    lock.current = true; setBusy(true); setError('');
    try { await socialTicketApi.reserve(session.id, paid ? Number(method) : null); navigate('/player/social-tickets'); }
    catch(e) { setError(socialError(e)); }
    finally {lock.current = false; setBusy(false);}
  }
  if (!canReserve) return <p className="text-sm text-gray-500">Buổi chơi đã hết slot hoặc không còn mở đăng ký.</p>;
  if (!authenticated) return <Link to="/login" className={`${primaryClass} block text-center`}>Đăng nhập để đăng ký</Link>;
  if (!player) return <p className="text-sm text-gray-500">Chỉ tài khoản Player được đăng ký vé.</p>;
  return <div className="space-y-3">
    <p className="text-xs text-gray-600">Yêu cầu uy tín từ 60 điểm, trình độ {session.minSkill}–{session.maxSkill}. Máy chủ kiểm tra điều kiện và số slot khi đăng ký.</p>
    {error && <ErrorPanel message={error} retry={paid ? () => setVersion(v=>v+1) : undefined} />}
    {paid && <><label className="block text-sm font-medium">Phương thức thanh toán<select className={inputClass} value={method} onChange={e=>setMethod(e.target.value)} disabled={loading || busy}><option value="">{loading?'Đang tải...':'Chọn phương thức'}</option>{methods.map(m=><option key={m.id} value={m.id}>{m.methodName}</option>)}</select></label>
    {!loading && !methods.length && <p className="text-sm text-gray-500">Chưa có phương thức online khả dụng.</p>}
    <p className="text-xs text-gray-500">Giữ slot tối đa 10 phút theo cấu hình hiện tại. Thanh toán thực tế đang chờ TV5 tích hợp.</p></>}
    <button type="button" disabled={busy || (paid && (loading || !method))} onClick={()=>void reserve()} className={`${primaryClass} w-full`}>{busy?'Đang xử lý...':paid?'Giữ slot':'Đăng ký miễn phí'}</button>
    <Link to="/player/social-tickets" className="block text-center text-sm font-semibold text-red-700">Xem vé của tôi</Link>
  </div>;
}
