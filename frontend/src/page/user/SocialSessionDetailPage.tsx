import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import SocialReservePanel from '../../components/social/SocialReservePanel';
import { ArrowLeft } from 'lucide-react';
import { socialApi, socialError } from '../../api/socialApi';
import type { SocialSession } from '../../api/socialApi';
import { facilityApi } from '../../api/facilityApi';
import type { FacilityDetail, Sport } from '../../api/facilityModels';
import { PublicSiteFooter, PublicSiteHeader } from '../../components/PublicSiteChrome';
import { ErrorPanel, money, SessionFacts, SlotMeter, statusLabel, isFuture } from '../../components/social/SocialShared';

export default function SocialSessionDetailPage() {
  const id = Number(useParams().id);
  const player = useLocation().pathname.startsWith('/player/');
  const [session, setSession] = useState<SocialSession | null>(null);
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setSession(null); setFacility(null); setSports([]); setError(''); setCatalogError(''); setLoading(true);
    if (!Number.isInteger(id) || id < 1) { setError('Mã buổi chơi không hợp lệ.'); setLoading(false); return; }
    void (async () => {
      try {
        const s = await socialApi.detail(id, abort.signal);
        if (abort.signal.aborted) return;
        setSession(s);
        try {
          const [f, sp] = await Promise.all([facilityApi.getFacility(s.facilityId), facilityApi.getSports()]);
          if (!abort.signal.aborted) { setFacility(f); setSports(sp); }
        } catch (e) { if (!abort.signal.aborted) setCatalogError(socialError(e)); }
      } catch (e) { if (!abort.signal.aborted) setError(socialError(e)); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    })();
    return () => abort.abort();
  }, [id, version]);
  const content = <div className="space-y-5">
    <Link to={player ? '/player/social' : '/social'} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700"><ArrowLeft size={16} /> Danh sách Social</Link>
    {loading ? <p role="status" className="text-gray-500">Đang tải chi tiết...</p> : error ? <ErrorPanel message={error} retry={() => setVersion(v => v + 1)} /> : session && <>
      {catalogError && <ErrorPanel message={`Không tải được thông tin cơ sở: ${catalogError}`} retry={() => setVersion(v => v + 1)} />}
      <div className="grid gap-6 lg:grid-cols-3"><section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
        <p className="text-sm font-semibold text-red-700">{sports.find(s => s.id === session.sportId)?.sportName ?? `Môn #${session.sportId}`} · {statusLabel(session.status)}</p>
        <h1 className="text-3xl font-bold">{session.title}</h1><SessionFacts session={session} facilityName={facility?.name ?? `Cơ sở #${session.facilityId}`} />
        {facility?.address && <p className="text-sm text-gray-500">{facility.address}</p>}
        <div className="border-t border-gray-100 pt-4"><h2 className="font-semibold">Sân được sử dụng</h2><ul className="mt-2 flex flex-wrap gap-2">{session.courtIds.map(c => <li key={c} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">{facility?.courts.find(x => x.id === c)?.courtName ?? `Sân #${c}`}</li>)}</ul></div>
        <div className="border-t border-gray-100 pt-4"><h2 className="font-semibold">Mô tả buổi chơi</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{session.description || 'Chưa có mô tả.'}</p></div>
      </section><aside className="h-fit space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">Giá mỗi slot</p><p className="text-3xl font-extrabold text-red-700">{money(session.feePerSlot)}</p><SlotMeter session={session} />
      <SocialReservePanel session={session} canReserve={session.status === 'Published' && isFuture(session) && session.availableSlots > 0} /></aside></div>
    </>}
  </div>;
  return player ? content : <div className="min-h-screen flex flex-col bg-background text-text"><PublicSiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{content}</main><PublicSiteFooter /></div>;
}
