import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Building2, CirclePlus, LoaderCircle, Pencil, Save, Swords, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, FacilityDetail, Sport } from '../../api/facilityModels';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const labelClass = 'text-sm font-medium text-gray-700';

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [managedSports, setManagedSports] = useState<Sport[]>([]);
  const [editingSportId, setEditingSportId] = useState<number | null>(null);
  const [savingSport, setSavingSport] = useState(false);
  const [sportForm, setSportForm] = useState({ sportCode: '', sportName: '', isActive: true });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFacility, setSavingFacility] = useState(false);
  const [savingCourt, setSavingCourt] = useState(false);
  const [facilityForm, setFacilityForm] = useState({
    name: '', address: '', hotline: '', openTime: '06:00', closeTime: '23:00',
  });
  const [editForm, setEditForm] = useState({
    name: '', address: '', hotline: '', openTime: '', closeTime: '', isActive: true,
  });
  const [courtForm, setCourtForm] = useState({
    sportId: '', courtName: '', courtCount: '1', courtType: 'Indoor' as 'Indoor' | 'Outdoor',
  });
  const activeSelectedId = selectedId ?? facilities[0]?.id ?? null;

  const loadFacilities = useCallback(async () => {
    try {
      const [rows, sportRows, allSports] = await Promise.all([
        facilityApi.getFacilities(), facilityApi.getSports(), facilityApi.getManagedSports(),
      ]);
      setFacilities(rows);
      setSports(sportRows);
      setManagedSports(allSports);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFacilities(); }, [loadFacilities]);

  const saveSport = async (event: FormEvent) => {
    event.preventDefault();
    setSavingSport(true);
    try {
      const request = {
        ...sportForm,
        sportCode: sportForm.sportCode.trim().toUpperCase().replace(/\s+/g, '_'),
        sportName: sportForm.sportName.trim(),
      };
      if (editingSportId === null) {
        await facilityApi.createSport(request);
        toast.success('Đã thêm bộ môn.');
      } else {
        await facilityApi.updateSport(editingSportId, request);
        toast.success('Đã cập nhật bộ môn.');
      }
      setEditingSportId(null);
      setSportForm({ sportCode: '', sportName: '', isActive: true });
      await loadFacilities();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingSport(false);
    }
  };

  const editSport = (sport: Sport) => {
    setEditingSportId(sport.id);
    setSportForm({ sportCode: sport.sportCode, sportName: sport.sportName, isActive: sport.isActive });
  };

  const deactivateSport = async (sport: Sport) => {
    if (!window.confirm(`Ngừng hoạt động bộ môn "${sport.sportName}"?`)) return;
    try {
      await facilityApi.deleteSport(sport.id);
      toast.success('Đã ngừng hoạt động bộ môn.');
      if (editingSportId === sport.id) {
        setEditingSportId(null);
        setSportForm({ sportCode: '', sportName: '', isActive: true });
      }
      await loadFacilities();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (activeSelectedId === null) return;
    let active = true;
    void facilityApi.getFacility(activeSelectedId).then((value) => {
      if (!active) return;
      setDetail(value);
      setEditForm({
        name: value.name, address: value.address, hotline: value.hotline,
        openTime: value.openTime.slice(0, 5), closeTime: value.closeTime.slice(0, 5),
        isActive: value.isActive,
      });
    }).catch((error: unknown) => toast.error(getErrorMessage(error)));
    return () => { active = false; };
  }, [activeSelectedId]);

  const createFacility = async (event: FormEvent) => {
    event.preventDefault();
    setSavingFacility(true);
    try {
      const created = await facilityApi.createFacility({
        ...facilityForm,
        openTime: `${facilityForm.openTime}:00`,
        closeTime: `${facilityForm.closeTime}:00`,
      });
      toast.success('Đã tạo cơ sở.');
      setFacilityForm({ name: '', address: '', hotline: '', openTime: '06:00', closeTime: '23:00' });
      await loadFacilities();
      setSelectedId(created.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingFacility(false);
    }
  };

  const updateFacility = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setSavingFacility(true);
    try {
      await facilityApi.updateFacility(detail.id, {
        ...editForm,
        openTime: `${editForm.openTime}:00`,
        closeTime: `${editForm.closeTime}:00`,
      });
      toast.success('Đã cập nhật cơ sở.');
      await loadFacilities();
      setSelectedId(detail.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingFacility(false);
    }
  };

  const createCourt = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setSavingCourt(true);
    try {
      await facilityApi.createCourts({
        facilityId: detail.id,
        sportId: Number(courtForm.sportId),
        namePrefix: courtForm.courtName.trim(),
        count: Number(courtForm.courtCount),
        courtType: courtForm.courtType,
      });
      toast.success(`Đã tạo ${courtForm.courtCount} sân.`);
      setCourtForm({ sportId: '', courtName: '', courtCount: '1', courtType: 'Indoor' });
      const refreshed = await facilityApi.getFacility(detail.id);
      setDetail(refreshed);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingCourt(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-sm font-medium text-red-700">UC04 · Quản lý danh mục</p>
        <h2 className="mt-1 text-2xl font-bold">Cơ sở & sân</h2>
        <p className="mt-1 text-sm text-gray-500">Quản lý thông tin cơ sở, giờ hoạt động và sân trực thuộc.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.8fr)]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold"><CirclePlus size={18} className="text-red-700" />Thêm cơ sở</h3>
            <form onSubmit={createFacility} className="space-y-3">
              <Field label="Tên cơ sở"><input required maxLength={150} value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} className={inputClass} /></Field>
              <Field label="Địa chỉ"><input required maxLength={255} value={facilityForm.address} onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })} className={inputClass} /></Field>
              <Field label="Hotline"><input required maxLength={15} value={facilityForm.hotline} onChange={(e) => setFacilityForm({ ...facilityForm, hotline: e.target.value })} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mở cửa"><input required type="time" value={facilityForm.openTime} onChange={(e) => setFacilityForm({ ...facilityForm, openTime: e.target.value })} className={inputClass} /></Field>
                <Field label="Đóng cửa"><input required type="time" value={facilityForm.closeTime} onChange={(e) => setFacilityForm({ ...facilityForm, closeTime: e.target.value })} className={inputClass} /></Field>
              </div>
              <button disabled={savingFacility} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60">
                {savingFacility ? <LoaderCircle size={17} className="animate-spin" /> : <CirclePlus size={17} />}Tạo cơ sở
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Quản lý bộ môn</h3>
            <form onSubmit={saveSport} className="space-y-3">
              <Field label="Mã bộ môn"><input required minLength={2} maxLength={30} pattern="[A-Za-z0-9_ ]+" value={sportForm.sportCode} onChange={(e) => setSportForm({ ...sportForm, sportCode: e.target.value })} placeholder="VD: BADMINTON" className={inputClass} /></Field>
              <Field label="Tên bộ môn"><input required minLength={2} maxLength={80} value={sportForm.sportName} onChange={(e) => setSportForm({ ...sportForm, sportName: e.target.value })} placeholder="VD: Cầu lông" className={inputClass} /></Field>
              {editingSportId !== null && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={sportForm.isActive} onChange={(e) => setSportForm({ ...sportForm, isActive: e.target.checked })} className="accent-red-700" />Đang hoạt động</label>}
              <div className="flex gap-2">
                <button disabled={savingSport} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60">
                  {savingSport ? <LoaderCircle size={16} className="animate-spin" /> : <CirclePlus size={16} />}{editingSportId === null ? 'Thêm bộ môn' : 'Lưu bộ môn'}
                </button>
                {editingSportId !== null && <button type="button" onClick={() => { setEditingSportId(null); setSportForm({ sportCode: '', sportName: '', isActive: true }); }} className="rounded-xl border border-gray-200 px-3 text-gray-600 hover:bg-gray-50" aria-label="Hủy sửa bộ môn"><X size={17} /></button>}
              </div>
            </form>
            <ul className="mt-4 divide-y divide-gray-100">
              {managedSports.map((sport) => <li key={sport.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{sport.sportName}</span><span className="text-xs text-gray-500">{sport.sportCode} · {sport.isActive ? 'Đang hoạt động' : 'Đã ngừng'}</span></span>
                <button type="button" onClick={() => editSport(sport)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={`Sửa ${sport.sportName}`}><Pencil size={15} /></button>
                {sport.isActive && <button type="button" onClick={() => void deactivateSport(sport)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Ngừng ${sport.sportName}`}><Trash2 size={15} /></button>}
              </li>)}
            </ul>
            {managedSports.length === 0 && <p className="mt-3 text-sm text-gray-500">Chưa có bộ môn. Thêm bộ môn để có thể tạo sân.</p>}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">Danh sách cơ sở đang hoạt động</h3>
            {loading ? <Loading /> : facilities.length === 0
              ? <p className="text-sm text-gray-500">Chưa có cơ sở hoạt động.</p>
              : <ul className="space-y-2">
                {facilities.map((facility) => (
                  <li key={facility.id}>
                    <button type="button" onClick={() => setSelectedId(facility.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === facility.id ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <span className="flex items-center justify-between gap-2 font-medium text-gray-900"><span className="truncate">{facility.name}</span><Building2 size={16} className="shrink-0 text-gray-400" /></span>
                      <span className="mt-1 block text-xs text-gray-500">{facility.address}</span>
                    </button>
                  </li>
                ))}
              </ul>}
          </div>
        </section>

        <section className="space-y-5">
          {detail?.id === activeSelectedId ? <>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold"><Save size={18} className="text-red-700" />Thông tin cơ sở</h3>
              <form onSubmit={updateFacility} className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên cơ sở"><input required maxLength={150} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} /></Field>
                <Field label="Hotline"><input required maxLength={15} value={editForm.hotline} onChange={(e) => setEditForm({ ...editForm, hotline: e.target.value })} className={inputClass} /></Field>
                <Field label="Địa chỉ"><input required maxLength={255} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className={inputClass} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mở cửa"><input required type="time" value={editForm.openTime} onChange={(e) => setEditForm({ ...editForm, openTime: e.target.value })} className={inputClass} /></Field>
                  <Field label="Đóng cửa"><input required type="time" value={editForm.closeTime} onChange={(e) => setEditForm({ ...editForm, closeTime: e.target.value })} className={inputClass} /></Field>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="accent-red-700" />
                  Cơ sở đang hoạt động
                </label>
                <div className="sm:col-span-2">
                  <button disabled={savingFacility} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                    {savingFacility ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Sân trực thuộc</h3>
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{detail.courts.length} sân</span>
              </div>
              {detail.courts.length === 0 ? <p className="mb-4 text-sm text-gray-500">Cơ sở chưa có sân.</p> : (
                <div className="mb-5 grid gap-2 sm:grid-cols-2">
                  {detail.courts.map((court) => <div key={court.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                    <Swords size={17} className="text-red-700" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{court.courtName}</p><p className="text-xs text-gray-500">{court.sportName} · ID {court.id}</p></div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${court.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{court.isActive ? 'Hoạt động' : 'Tạm dừng'}</span>
                  </div>)}
                </div>
              )}
              <form onSubmit={createCourt} className="grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
                <Field label="Tiền tố tên sân"><input required maxLength={42} value={courtForm.courtName} onChange={(e) => setCourtForm({ ...courtForm, courtName: e.target.value })} placeholder="Sân cầu lông" className={inputClass} /></Field>
                <Field label="Bộ môn"><select required value={courtForm.sportId} onChange={(e) => setCourtForm({ ...courtForm, sportId: e.target.value })} className={inputClass}><option value="">Chọn bộ môn</option>{sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.sportName}</option>)}</select></Field>
                <Field label="Số lượng"><input required type="number" min={1} max={100} value={courtForm.courtCount} onChange={(e) => setCourtForm({ ...courtForm, courtCount: e.target.value })} className={inputClass} /></Field>
                <Field label="Loại sân"><select value={courtForm.courtType} onChange={(e) => setCourtForm({ ...courtForm, courtType: e.target.value as 'Indoor' | 'Outdoor' })} className={inputClass}><option value="Indoor">Trong nhà</option><option value="Outdoor">Ngoài trời</option></select></Field>
                <button disabled={savingCourt || sports.length === 0} className="flex h-[42px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 lg:col-span-4">
                  {savingCourt ? <LoaderCircle size={16} className="animate-spin" /> : <CirclePlus size={16} />}Tạo sân
                </button>
              </form>
              {sports.length === 0 && <p className="mt-2 text-xs text-amber-700">Không có bộ môn đang hoạt động để tạo sân.</p>}
            </div>
          </> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">{loading ? <Loading /> : 'Chọn một cơ sở để xem và chỉnh sửa.'}</div>}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className={labelClass}>{label}</span>{children}</label>;
}

function Loading() {
  return <span className="inline-flex items-center gap-2 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" />Đang tải...</span>;
}
