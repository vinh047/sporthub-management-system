import { useEffect, useState } from 'react';
import SocialAttendancePanel from '../../components/social/SocialAttendancePanel';
import type { FormEvent } from 'react';
import { Plus, Pencil, Ban, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, FacilityDetail, Sport } from '../../api/facilityModels';
import { socialApi, socialError } from '../../api/socialApi';
import type { SocialInput, SocialSession } from '../../api/socialApi';
import { useAuthStore } from '../../store/authStore';
import { ErrorPanel, inputClass, primaryClass, secondaryClass, money, dateLabel, timeLabel, statusLabel, vietnamNow, isFuture } from '../../components/social/SocialShared';

const makeInput = (facilityId: number): SocialInput => ({ facilityId, sportId: 0, title: '', playDate: '', startTime: '', endTime: '', maxParticipants: 12, feePerSlot: 0, minSkill: 1, maxSkill: 5, description: '', courtIds: [] });
const normalizeTime = (t: string) => t.length === 5 ? `${t}:00` : t;

export default function SocialManagePage() {
  const user = useAuthStore(s => s.user);
  const isStaff = user?.role === 'STAFF';
  const assigned = user?.facilityId ?? 0;
  const [items, setItems] = useState<SocialSession[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState<{ id: number | null; input: SocialInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const reload = () => setVersion(v => v + 1);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(''); setCatalogError(''); setItems([]);
    if (isStaff && !assigned) { setLoading(false); return; }
    void (async () => {
      try {
        const result = await socialApi.manage(abort.signal);
        if (!abort.signal.aborted) setItems(result);
      } catch (e) { if (!abort.signal.aborted) setError(socialError(e)); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    })();
    Promise.all([facilityApi.getFacilities(), facilityApi.getSports()]).then(([f,s]) => {
      if (!abort.signal.aborted) { setFacilities(f.filter(x => x.isActive && (!isStaff || x.id === assigned))); setSports(s.filter(x => x.isActive)); }
    }).catch(e => { if (!abort.signal.aborted) setCatalogError(socialError(e)); });
    return () => abort.abort();
  }, [isStaff, assigned, version]);
  const facilityName = (id: number) => facilities.find(x => x.id === id)?.name ?? `Cơ sở #${id}`;
  const sportName = (id: number) => sports.find(x => x.id === id)?.sportName ?? `Môn #${id}`;
  const visible = items.filter(s => !statusFilter || s.status === statusFilter);
  const detail = items.find(s => s.id === detailId);
  const editable = (s: SocialSession) => s.status === 'Published' && isFuture(s) && s.registeredCount === 0;
  const startEdit = (s: SocialSession) => {
    const input: SocialInput = { ...makeInput(s.facilityId), sportId: s.sportId, title: s.title, playDate: s.playDate, startTime: timeLabel(s.startTime), endTime: timeLabel(s.endTime), maxParticipants: s.maxParticipants, feePerSlot: s.feePerSlot, minSkill: s.minSkill, maxSkill: s.maxSkill, description: s.description, courtIds: [...s.courtIds] };
    setEditor({ id: s.id, input }); setDetailId(null);
  };
  const cancel = async () => {
    if (cancelId === null || busy) return;
    setBusy(true);
    try { await socialApi.cancel(cancelId); toast.success('Đã hủy buổi Social.'); setCancelId(null); setDetailId(null); reload(); }
    catch (e) { toast.error(socialError(e)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-red-700">VẬN HÀNH / SOCIAL</p><h2 className="mt-1 text-2xl font-bold">Quản lý buổi chơi Social</h2><p className="mt-1 text-sm text-gray-500">Tạo lịch giao lưu, chọn sân và theo dõi số lượng người tham gia.</p></div><div className="flex gap-2"><button type="button" className={secondaryClass} onClick={reload} disabled={loading || busy || !!editor}><RefreshCw size={16} aria-label="Làm mới" /></button><button type="button" className={`${primaryClass} flex items-center gap-2`} disabled={!facilities.length || !sports.length || busy || !!editor || cancelId !== null} onClick={() => setEditor({ id: null, input: makeInput(isStaff ? assigned : 0) })}><Plus size={18} /> Tạo buổi Social</button></div></div>
    {isStaff && !assigned && <ErrorPanel message="Tài khoản Staff chưa được phân công cơ sở. Liên hệ quản trị viên để được gán cơ sở." />}
    {catalogError && <ErrorPanel message={`Không tải được danh mục: ${catalogError}`} retry={reload} />}
    {!loading && !facilities.length && !catalogError && !(isStaff && !assigned) && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Chưa có cơ sở đang hoạt động trong phạm vi quản lý. Có thể xem danh sách hiện có; chờ dữ liệu cơ sở và sân từ phân hệ quản lý cơ sở trước khi tạo buổi.</p>}
    <div className="grid gap-3 sm:grid-cols-3">{[['Tổng số buổi', items.length], ['Đang mở', items.filter(s => s.status === 'Published').length], ['Đã hủy', items.filter(s => s.status === 'Cancelled').length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold text-red-700">{value}</p></div>)}</div>
    {error && <ErrorPanel message={error} retry={reload} />}
    {editor && <SocialEditor key={editor.id ?? 'new'} initial={editor.input} editId={editor.id} facilities={facilities} sports={sports} fixedFacility={isStaff} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); reload(); }} />}
    {cancelId !== null && <div role="alertdialog" aria-label="Xác nhận hủy buổi" className="rounded-2xl border border-red-200 bg-red-50 p-5"><h3 className="font-bold text-red-900">Hủy buổi #{cancelId}?</h3><p className="mt-2 text-sm text-red-800">Buổi sẽ chuyển sang trạng thái đã hủy, không xóa dữ liệu. Máy chủ sẽ kiểm tra lịch và người tham gia.</p><div className="mt-3 flex gap-2"><button type="button" className={primaryClass} onClick={cancel} disabled={busy}>{busy ? 'Đang hủy...' : 'Xác nhận hủy'}</button><button type="button" className={secondaryClass} disabled={busy} onClick={() => setCancelId(null)}>Quay lại</button></div></div>}
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4"><h3 className="font-bold">Danh sách buổi chơi</h3><select aria-label="Lọc trạng thái" className={`${inputClass} max-w-[220px]`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{Array.from(new Set(items.map(s => s.status))).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
    {loading ? <p role="status" className="p-8 text-sm text-gray-500">Đang tải...</p> : !error && (!visible.length ? <div className="p-10 text-center text-gray-500"><Users className="mx-auto mb-2" size={32} /><p>Chưa có buổi chơi phù hợp.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Buổi chơi','Lịch chơi','Slot','Giá vé','Trạng thái','Thao tác'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{visible.map(s => <tr key={s.id}><td className="px-4 py-3"><button type="button" className="text-left font-semibold text-red-700 hover:underline" onClick={() => setDetailId(s.id)}>{s.title}</button><p className="text-xs text-gray-500">{facilityName(s.facilityId)} · {sportName(s.sportId)}</p></td><td className="px-4 py-3 whitespace-nowrap">{dateLabel(s.playDate)}<br />{timeLabel(s.startTime)} – {timeLabel(s.endTime)}</td><td className="px-4 py-3 whitespace-nowrap">{s.registeredCount}/{s.maxParticipants}<br /><span className="text-xs text-gray-500">Còn {s.availableSlots}</span></td><td className="px-4 py-3 whitespace-nowrap">{money(s.feePerSlot)}</td><td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${s.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{statusLabel(s.status)}</span></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" className={secondaryClass} disabled={busy || attendanceId !== null || !!editor || cancelId !== null} onClick={() => { setAttendanceId(s.id); setDetailId(null); }}>Check-in</button><button type="button" aria-label={`Sửa ${s.title}`} title="Sửa buổi" className={secondaryClass} disabled={!editable(s) || busy || !!editor || cancelId !== null} onClick={() => startEdit(s)}><Pencil size={15} /></button><button type="button" aria-label={`Hủy ${s.title}`} title="Hủy buổi" className={`${secondaryClass} text-red-700`} disabled={!editable(s) || busy || !!editor || cancelId !== null} onClick={() => setCancelId(s.id)}><Ban size={15} /></button></div></td></tr>)}</tbody></table></div>)}
    </div>
    {attendanceId !== null && <SocialAttendancePanel key={attendanceId} sessionId={attendanceId} onClose={() => { setAttendanceId(null); reload(); }} />}
    {detail && <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2"><div className="flex justify-between gap-3"><h3 className="font-bold">Chi tiết: {detail.title}</h3><button type="button" className={secondaryClass} onClick={() => setDetailId(null)}>Đóng</button></div><p className="text-sm">Trình độ: {detail.minSkill} – {detail.maxSkill}</p><p className="text-sm">Sân: {detail.courtIds.map(id => `#${id}`).join(', ')}</p><p className="whitespace-pre-wrap text-sm text-gray-600">{detail.description || 'Chưa có mô tả.'}</p></div>}
  </div>;
}

function SocialEditor({ initial, editId, facilities, sports, fixedFacility, onClose, onSaved }: { initial: SocialInput; editId: number | null; facilities: Facility[]; sports: Sport[]; fixedFacility: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setFacility(null); setCatalogError('');
    if (!form.facilityId) { setLoading(false); return; }
    setLoading(true);
    facilityApi.getFacility(form.facilityId).then(f => { if (active) setFacility(f); }).catch(e => { if (active) setCatalogError(socialError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [form.facilityId, version]);
  const selectedSport = sports.find(s => s.id === form.sportId);
  // FacilityDetail supplies sportName, not sportId, for each court.
  const courts = (facility?.courts ?? []).filter(c => c.isActive && !!selectedSport && c.sportName === selectedSport.sportName);
  const validCourts = form.courtIds.length > 0 && form.courtIds.every(id => courts.some(c => c.id === id));
  const patch = <K extends keyof SocialInput>(key: K, value: SocialInput[K]) => setForm(f => ({ ...f, [key]: value }));
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (saving) return; setError('');
    const input = { ...form, title: form.title.trim(), description: form.description?.trim() || null, startTime: normalizeTime(form.startTime), endTime: normalizeTime(form.endTime) };
    if (!input.facilityId || !input.sportId || !validCourts || input.title.length < 3) { setError('Nhập tên buổi, chọn cơ sở, môn và ít nhất một sân hợp lệ.'); return; }
    if (input.startTime >= input.endTime || `${input.playDate}T${input.startTime}` <= vietnamNow() || input.minSkill > input.maxSkill) { setError('Ngày giờ hoặc khoảng trình độ không hợp lệ.'); return; }
    if (facility && (input.startTime < normalizeTime(facility.openTime) || input.endTime > normalizeTime(facility.closeTime))) { setError('Giờ chơi phải nằm trong giờ mở cửa cơ sở.'); return; }
    setSaving(true);
    try { if (editId === null) await socialApi.create(input); else await socialApi.update(editId, input); toast.success(editId === null ? 'Đã tạo buổi Social.' : 'Đã cập nhật buổi Social.'); onSaved(); }
    catch (err) { setError(socialError(err)); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex justify-between gap-3"><h3 className="text-lg font-bold">{editId === null ? 'Tạo buổi chơi' : `Chỉnh sửa buổi #${editId}`}</h3><button type="button" className={secondaryClass} disabled={saving} onClick={onClose}>Đóng</button></div>
    {error && <ErrorPanel message={error} />}
    <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
      <label className="space-y-1 text-sm font-medium sm:col-span-2 lg:col-span-3">Tên buổi chơi<input required minLength={3} maxLength={200} value={form.title} className={inputClass} onChange={e => patch('title', e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Cơ sở<select required disabled={fixedFacility || saving} value={form.facilityId || ''} className={inputClass} onChange={e => setForm(f => ({ ...f, facilityId: Number(e.target.value), courtIds: [] }))}><option value="">Chọn cơ sở</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>{facility && <span className="block text-xs text-gray-500">Giờ mở cửa: {timeLabel(facility.openTime)}–{timeLabel(facility.closeTime)}</span>}</label>
      <label className="space-y-1 text-sm font-medium">Môn thể thao<select required value={form.sportId || ''} className={inputClass} onChange={e => setForm(f => ({ ...f, sportId: Number(e.target.value), courtIds: [] }))}><option value="">Chọn môn</option>{sports.map(s => <option key={s.id} value={s.id}>{s.sportName}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Ngày chơi<input required type="date" min={vietnamNow().slice(0,10)} value={form.playDate} className={inputClass} onChange={e => patch('playDate', e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Giờ bắt đầu<input required type="time" value={form.startTime} className={inputClass} onChange={e => patch('startTime', e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Giờ kết thúc<input required type="time" value={form.endTime} className={inputClass} onChange={e => patch('endTime', e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Số người tối đa<input required type="number" min="1" max="1000" step="1" value={form.maxParticipants || ''} className={inputClass} onChange={e => patch('maxParticipants', Number(e.target.value))} /></label>
      <label className="space-y-1 text-sm font-medium">Giá mỗi slot (VNĐ)<input required type="number" min="0" max="999999999" step="1" value={form.feePerSlot} className={inputClass} onChange={e => patch('feePerSlot', Number(e.target.value))} /></label>
      <label className="space-y-1 text-sm font-medium">Trình độ tối thiểu<input required type="number" min="1" max="5" step="0.01" value={form.minSkill} className={inputClass} onChange={e => patch('minSkill', Number(e.target.value))} /></label>
      <label className="space-y-1 text-sm font-medium">Trình độ tối đa<input required type="number" min="1" max="5" step="0.01" value={form.maxSkill} className={inputClass} onChange={e => patch('maxSkill', Number(e.target.value))} /></label>
      <div className="space-y-2 sm:col-span-2 lg:col-span-3"><p className="text-sm font-semibold">Chọn sân con ({form.courtIds.length})</p>{catalogError ? <ErrorPanel message={catalogError} retry={() => setVersion(v => v + 1)} /> : loading ? <p className="text-sm text-gray-500">Đang tải sân...</p> : !form.facilityId || !form.sportId ? <p className="text-sm text-gray-500">Chọn cơ sở và môn để xem sân.</p> : !courts.length ? <p className="text-sm text-gray-500">Không có sân đang hoạt động cho môn tại cơ sở này.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{courts.map(c => <label key={c.id} className="flex gap-2 items-center rounded-xl border border-gray-200 p-3 text-sm"><input type="checkbox" className="accent-red-700" checked={form.courtIds.includes(c.id)} onChange={e => setForm(f => ({ ...f, courtIds: e.target.checked ? [...f.courtIds, c.id] : f.courtIds.filter(id => id !== c.id) }))} />{c.courtName}</label>)}</div>}<p className="text-xs text-gray-500">Máy chủ sẽ kiểm tra trùng lịch, bảo trì và giờ mở cửa khi lưu.</p></div>
      <label className="space-y-1 text-sm font-medium sm:col-span-2 lg:col-span-3">Mô tả<textarea rows={3} value={form.description ?? ''} className={inputClass} onChange={e => patch('description', e.target.value)} /></label>
    </fieldset><button type="submit" className={primaryClass} disabled={saving || loading || !validCourts}>{saving ? 'Đang lưu...' : 'Lưu buổi chơi'}</button>
  </form>;
}
