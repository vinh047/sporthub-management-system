import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ArrowRight, LoaderCircle } from 'lucide-react';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { socialApi, socialError } from '../../api/socialApi';
import type { SocialFilters, SocialSession } from '../../api/socialApi';
import { PublicSiteHeader, PublicSiteFooter } from '../../components/PublicSiteChrome';
import { ErrorPanel, inputClass, primaryClass, secondaryClass, SessionFacts, SlotMeter, money } from '../../components/social/SocialShared';

export default function SocialSessionsPage() {
  const player = useLocation().pathname.startsWith('/player/');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [draft, setDraft] = useState<SocialFilters>({});
  const [filters, setFilters] = useState<SocialFilters>({});
  const [items, setItems] = useState<SocialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [validation, setValidation] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setCatalogError('');
    Promise.all([facilityApi.getFacilities(), facilityApi.getSports()]).then(([f, s]) => {
      if (active) { setFacilities(f); setSports(s); }
    }).catch(e => { if (active) setCatalogError(socialError(e)); });
    return () => { active = false; };
  }, [version]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(''); setItems([]);
    socialApi.list(filters, abort.signal).then(data => { if (!abort.signal.aborted) setItems(data); })
      .catch(e => { if (!abort.signal.aborted) setError(socialError(e)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [filters, version]);
  const num = (value: string) => value === '' ? undefined : Number(value);
  const content = <div className="space-y-6">
    <section className="rounded-3xl bg-gradient-to-br from-red-700 via-red-800 to-[#3d0b0b] p-7 sm:p-10 text-white shadow-lg">
      <p className="mb-2 text-sm font-semibold text-red-100">SPORTHUB / SOCIAL</p>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Tìm buổi chơi cộng đồng</h1>
      <p className="mt-3 max-w-2xl text-red-100">Kết nối người chơi cùng môn thể thao và trình độ. Khám phá lịch chơi, giá vé và số slot còn trống.</p>
    </section>
    {catalogError && <ErrorPanel message={`Không tải được danh mục: ${catalogError}`} retry={() => setVersion(v => v + 1)} />}
    <form className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3" onSubmit={e => {
      e.preventDefault();
      if (draft.minSkill != null && draft.maxSkill != null && draft.minSkill > draft.maxSkill) { setValidation('Trình độ tối thiểu không được lớn hơn tối đa.'); return; }
      setValidation(''); setFilters({ ...draft });
    }}>
      <label className="space-y-1 text-sm font-medium">Môn thể thao<select className={inputClass} value={draft.sportId ?? ''} onChange={e => setDraft(d => ({ ...d, sportId: num(e.target.value) }))}><option value="">Tất cả môn</option>{sports.map(s => <option key={s.id} value={s.id}>{s.sportName}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Cơ sở<select className={inputClass} value={draft.facilityId ?? ''} onChange={e => setDraft(d => ({ ...d, facilityId: num(e.target.value) }))}><option value="">Tất cả cơ sở</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Ngày chơi<input type="date" className={inputClass} value={draft.date ?? ''} onChange={e => setDraft(d => ({ ...d, date: e.target.value || undefined }))} /></label>
      <label className="space-y-1 text-sm font-medium">Trình độ từ<input type="number" min="1" max="5" step="0.1" className={inputClass} value={draft.minSkill ?? ''} onChange={e => setDraft(d => ({ ...d, minSkill: num(e.target.value) }))} placeholder="1.0" /></label>
      <label className="space-y-1 text-sm font-medium">Đến<input type="number" min="1" max="5" step="0.1" className={inputClass} value={draft.maxSkill ?? ''} onChange={e => setDraft(d => ({ ...d, maxSkill: num(e.target.value) }))} placeholder="5.0" /></label>
      <div className="flex items-end gap-2"><button className={`${primaryClass} flex-1`} type="submit">Tìm buổi chơi</button><button type="button" className={secondaryClass} onClick={() => { setDraft({}); setFilters({}); setValidation(''); }}>Xóa lọc</button></div>
      {validation && <div className="sm:col-span-2 lg:col-span-3"><ErrorPanel message={validation} /></div>}
    </form>
    {loading ? <p role="status" className="flex items-center gap-2 text-gray-500"><LoaderCircle className="animate-spin" size={20} /> Đang tải buổi chơi...</p> : error ? <ErrorPanel message={error} retry={() => setVersion(v => v + 1)} /> : <>
      <p className="text-sm text-gray-500">Tìm thấy <strong className="text-gray-900">{items.length}</strong> buổi chơi</p>
      {!items.length ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center"><Users className="mx-auto mb-3 text-gray-400" size={40} /><h2 className="text-lg font-semibold">Chưa có buổi chơi phù hợp</h2><p className="mt-2 text-sm text-gray-500">Thử thay đổi bộ lọc hoặc quay lại khi có lịch Social mới.</p></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(s => <article key={s.id} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{sports.find(x => x.id === s.sportId)?.sportName ?? `Môn #${s.sportId}`}</span><span className="font-bold text-red-700">{money(s.feePerSlot)}<span className="text-xs font-normal text-gray-500"> / slot</span></span></div>
        <h2 className="text-lg font-bold">{s.title}</h2><SessionFacts session={s} facilityName={facilities.find(f => f.id === s.facilityId)?.name ?? `Cơ sở #${s.facilityId}`} /><SlotMeter session={s} />
        <Link className={`${secondaryClass} mt-auto flex items-center justify-between`} to={`${player ? '/player/social' : '/social'}/${s.id}`}>Xem chi tiết <ArrowRight size={16} /></Link>
      </article>)}</div>}
    </>}
  </div>;
  return player ? content : <div className="min-h-screen flex flex-col bg-background text-text"><PublicSiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{content}</main><PublicSiteFooter /></div>;
}
