import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { socialError } from '../../api/socialApi';
import { socialTicketApi, ticketStatus, utcMillis } from '../../api/socialTicketApi';
import type { CancellationQuote, SocialTicket } from '../../api/socialTicketApi';
import { ErrorPanel, money, primaryClass, secondaryClass } from '../../components/social/SocialShared';

function remaining(t: SocialTicket, now: number) {
  return t.holdExpiresAtUtc ? Math.max(0, Math.ceil((utcMillis(t.holdExpiresAtUtc)-now)/1000)) : 0;
}
const formatSeconds = (seconds: number) => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
function displayDate(value: string) { return new Date(utcMillis(value)).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}); }
export default function SocialTicketsPage() {
  const [tickets,setTickets] = useState<SocialTicket[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [version,setVersion] = useState(0);
  const [now,setNow] = useState(Date.now());
  const [selected,setSelected] = useState<{id:number;quote:CancellationQuote}|null>(null);
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(()=>{const interval=window.setInterval(()=>setNow(Date.now()),1000); return ()=>window.clearInterval(interval);},[]);
  useEffect(()=>{
    const ac=new AbortController();setLoading(true);setError('');
    socialTicketApi.mine(ac.signal).then(t=>{if(!ac.signal.aborted)setTickets(t);}).catch(e=>{if(!ac.signal.aborted)setError(socialError(e));}).finally(()=>{if(!ac.signal.aborted)setLoading(false);});
    return ()=>ac.abort();
  },[version]);
  async function quote(id:number){
    if(lock.current)return;lock.current=true;setBusy(true);setSelected(null);setError('');setNotice('');
    try{setSelected({id,quote:await socialTicketApi.quote(id)});}catch(e){setError(socialError(e));}finally{lock.current=false;setBusy(false);}
  }
  async function cancel(){
    if(lock.current || !selected?.quote.canCancel)return;lock.current=true;setBusy(true);setError('');
    try {const t=await socialTicketApi.cancel(selected.id);setTickets(old=>old.map(x=>x.id===t.id?t:x));setSelected(null);setNotice('Đã hủy vé. '+(t.paymentStatus==='Refunded'?'Giao dịch giả lập đã được ghi nhận hoàn tiền.':''));}
    catch(e){setError(socialError(e));setSelected(null);}finally{lock.current=false;setBusy(false);}
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Vé Social của tôi</h1><p className="mt-1 text-sm text-gray-500">Theo dõi vé và trạng thái thanh toán</p></div><div className="flex gap-2"><button disabled={busy || loading} className={secondaryClass} onClick={()=>{setSelected(null);setVersion(v=>v+1);}}>Tải lại</button><Link to="/player/social" className={primaryClass}>Tìm buổi chơi</Link></div></div>
    {error && <ErrorPanel message={error} />}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {selected && <section role="region" aria-label="Xác nhận hủy vé" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"><h2 className="font-semibold">Hủy vé #{selected.id}</h2><p className="text-sm">{selected.quote.message}</p>{selected.quote.refundAmount!==null && <p className="text-sm">Mức hoàn dự kiến: {money(selected.quote.refundAmount)}</p>}<div className="flex gap-2">{selected.quote.canCancel && <button disabled={busy} className={primaryClass} onClick={()=>void cancel()}>Xác nhận hủy</button>}<button disabled={busy} className={secondaryClass} onClick={()=>setSelected(null)}>Đóng</button></div></section>}
    {loading ? <p role="status">Đang tải vé...</p> : !tickets.length ? <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">Chưa có vé Social nào.</div> : <div className="grid gap-4 md:grid-cols-2">{tickets.map(t=>{
      const seconds=remaining(t,now); const expired=t.status==='PendingPayment' && t.holdExpiresAtUtc!==null && seconds===0; const status=expired?'Expired':t.status;
      return <article key={t.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-2"><span className="text-xs text-gray-500">Vé #{t.id}</span><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{ticketStatus(status)}</span></div><h2 className="text-lg font-bold">{t.sessionTitle}</h2><dl className="space-y-1 text-sm text-gray-600"><div>Đăng ký: {displayDate(t.registeredAt)}</div><div>Giá vé: {money(t.fee)}</div><div>Đã thanh toán: {money(t.paidAmount)}</div>{t.paymentTransactionId!==null && <div>Mã giao dịch: #{t.paymentTransactionId} · {t.paymentStatus ?? 'Chưa xác định'}</div>}</dl>
      {status==='PendingPayment' && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Thời gian giữ chỗ: <strong>{formatSeconds(seconds)}</strong><p className="mt-1 text-xs">Chờ tích hợp thanh toán TV5. Không chuyển tiền theo thông tin chưa được xác minh.</p></div>}
      {expired && <p className="text-sm text-gray-500">Đã hết thời gian giữ chỗ. Tải lại để kiểm tra trạng thái từ máy chủ.</p>}
      <div className="flex flex-wrap gap-2"><Link to={`/player/social/${t.sessionId}`} className={secondaryClass}>Xem buổi chơi</Link>{['PendingPayment','Confirmed','Expired'].includes(status) && <button disabled={busy} className={secondaryClass} onClick={()=>void quote(t.id)}>Kiểm tra hủy vé</button>}</div></article>;
    })}</div>}
  </div>;
}
