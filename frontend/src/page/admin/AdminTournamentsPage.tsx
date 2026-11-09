import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  Award, CircleCheck, Crown, Eye, LoaderCircle, Plus, Trophy, Users, X,
} from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { tournamentApi } from '../../api/tournamentApi';
import type { TournamentDetailDto, TournamentDto } from '../../api/tournamentApi';
import { useAuthStore } from '../../store/authStore';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500';

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Nháp (Draft)' },
  { value: 'OpenReg', label: 'Mở đăng ký (OpenReg)' },
  { value: 'DrawCompleted', label: 'Đã bốc thăm (DrawCompleted)' },
  { value: 'InProgress', label: 'Đang thi đấu (InProgress)' },
  { value: 'Finished', label: 'Đã kết thúc (Finished)' },
];

const todayIso = () => new Date().toLocaleDateString('sv-SE');

export default function AdminTournamentsPage() {
  const user = useAuthStore((s) => s.user);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form khởi tạo giải đấu
  const [facilityId, setFacilityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [name, setName] = useState('');
  const [tournamentType, setTournamentType] = useState('SingleElimination');
  const [registrationDeadline, setRegistrationDeadline] = useState(() => `${todayIso()}T23:59`);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [maxTeams, setMaxTeams] = useState(8);
  const [entryFee, setEntryFee] = useState(150000);
  const [prizeDescription, setPrizeDescription] = useState('');
  const [status, setStatus] = useState('OpenReg');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Chi tiết giải & Đội đăng ký
  const [selectedDetail, setSelectedDetail] = useState<TournamentDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [facs, sps, list] = await Promise.all([
        facilityApi.getFacilities(),
        facilityApi.getSports(),
        tournamentApi.getAll(),
      ]);
      const allowedFacilities =
        user?.role === 'STAFF' && user.facilityId
          ? facs.filter((f) => f.id === user.facilityId)
          : facs;
      setFacilities(allowedFacilities);
      setSports(sps);
      setTournaments(list);
      setFacilityId((cur) => cur || (allowedFacilities[0] ? String(allowedFacilities[0].id) : ''));
      setSportId((cur) => cur || (sps[0] ? String(sps[0].id) : ''));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.facilityId, user?.role]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const validateCreateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!facilityId) errs.facilityId = 'Vui lòng chọn cơ sở tổ chức.';
    if (!sportId) errs.sportId = 'Vui lòng chọn bộ môn thi đấu.';

    const trimmedName = name.trim();
    if (!trimmedName) {
      errs.name = 'Tên giải đấu không được để trống.';
    } else if (trimmedName.length < 3 || trimmedName.length > 150) {
      errs.name = 'Tên giải đấu phải từ 3 đến 150 ký tự.';
    }

    if (Number.isNaN(Number(entryFee)) || Number(entryFee) < 0 || Number(entryFee) > 100_000_000) {
      errs.entryFee = 'Lệ phí phải từ 0đ đến 100.000.000đ.';
    }

    if (!registrationDeadline) {
      errs.registrationDeadline = 'Vui lòng chọn hạn chót đăng ký.';
    } else if (registrationDeadline.slice(0, 10) > startDate) {
      errs.registrationDeadline = 'Hạn chót đăng ký không được vượt quá ngày bắt đầu.';
    }

    if (!startDate) {
      errs.startDate = 'Vui lòng chọn ngày bắt đầu.';
    }
    if (!endDate) {
      errs.endDate = 'Vui lòng chọn ngày kết thúc.';
    } else if (endDate < startDate) {
      errs.endDate = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.';
    }

    if (prizeDescription.trim().length > 2000) {
      errs.prizeDescription = 'Điều lệ và cơ cấu giải thưởng tối đa 2000 ký tự.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin khởi tạo giải đấu.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await tournamentApi.create({
        facilityId: Number(facilityId),
        sportId: Number(sportId),
        name: name.trim(),
        tournamentType,
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        startDate,
        endDate,
        maxTeams: Number(maxTeams),
        entryFee: Number(entryFee),
        prizeDescription: prizeDescription.trim() || undefined,
        status,
      });
      toast.success(res.message ?? 'Khởi tạo giải đấu thành công!');
      setName('');
      setPrizeDescription('');
      setFormErrors({});
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await tournamentApi.updateStatus(id, newStatus);
      toast.success('Đã cập nhật trạng thái giải đấu.');
      await loadAll();
      if (selectedDetail?.id === id) {
        setSelectedDetail(await tournamentApi.getById(id));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const inspectTournament = async (id: number) => {
    setDetailLoading(true);
    try {
      setSelectedDetail(await tournamentApi.getById(id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-sm font-medium text-red-700">Quản lý Giải đấu · UC18 & UC19</p>
        <h2 className="mt-1 text-2xl font-bold">Khởi tạo & Điều hành Giải đấu</h2>
        <p className="text-sm text-gray-500">
          Cấu hình giải đấu mới, mở cổng đăng ký và theo dõi danh sách các đội / vận động viên tham dự.
        </p>
      </div>

      {/* Form Khởi tạo Giải đấu */}
      <form
        onSubmit={handleCreate}
        className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Plus size={18} className="text-red-700" /> Khởi tạo giải đấu mới
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className={labelClass}>Cơ sở tổ chức</span>
            <select required value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputClass}>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Bộ môn</span>
            <select required value={sportId} onChange={(e) => setSportId(e.target.value)} className={inputClass}>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.sportName}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Tên giải đấu *</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="VD: Giải Cầu Lông SportHub Mở Rộng"
              className={`${inputClass} ${formErrors.name ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.name && <p className="text-xs font-medium text-red-600">{formErrors.name}</p>}
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Thể thức thi đấu</span>
            <select value={tournamentType} onChange={(e) => setTournamentType(e.target.value)} className={inputClass}>
              <option value="SingleElimination">Loại trực tiếp (Knockout)</option>
              <option value="RoundRobin">Đấu vòng tròn (Round Robin)</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Số đội tối đa</span>
            <select value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} className={inputClass}>
              {[4, 8, 16, 32].map((n) => (
                <option key={n} value={n}>{n} đội</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Lệ phí đăng ký (VNĐ / đội)</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={entryFee}
              onChange={(e) => {
                setEntryFee(Number(e.target.value));
                if (formErrors.entryFee) setFormErrors((prev) => ({ ...prev, entryFee: '' }));
              }}
              className={`${inputClass} ${formErrors.entryFee ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.entryFee && <p className="text-xs font-medium text-red-600">{formErrors.entryFee}</p>}
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Hạn chót đăng ký</span>
            <input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => {
                setRegistrationDeadline(e.target.value);
                if (formErrors.registrationDeadline) setFormErrors((prev) => ({ ...prev, registrationDeadline: '' }));
              }}
              className={`${inputClass} ${formErrors.registrationDeadline ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.registrationDeadline && (
              <p className="text-xs font-medium text-red-600">{formErrors.registrationDeadline}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Ngày bắt đầu</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (formErrors.startDate || formErrors.registrationDeadline) {
                  setFormErrors((prev) => ({ ...prev, startDate: '', registrationDeadline: '' }));
                }
              }}
              className={`${inputClass} ${formErrors.startDate ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.startDate && <p className="text-xs font-medium text-red-600">{formErrors.startDate}</p>}
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Ngày kết thúc</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (formErrors.endDate) setFormErrors((prev) => ({ ...prev, endDate: '' }));
              }}
              className={`${inputClass} ${formErrors.endDate ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.endDate && <p className="text-xs font-medium text-red-600">{formErrors.endDate}</p>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 sm:col-span-2">
            <span className={labelClass}>Điều lệ & Cơ cấu giải thưởng ({prizeDescription.length}/2000)</span>
            <textarea
              rows={2}
              value={prizeDescription}
              onChange={(e) => {
                setPrizeDescription(e.target.value);
                if (formErrors.prizeDescription) setFormErrors((prev) => ({ ...prev, prizeDescription: '' }));
              }}
              placeholder="Nhập cơ cấu giải thưởng, thể lệ set đấu, yêu cầu trình độ..."
              className={`${inputClass} ${formErrors.prizeDescription ? 'border-red-500 bg-red-50/30' : ''}`}
            />
            {formErrors.prizeDescription && (
              <p className="text-xs font-medium text-red-600">{formErrors.prizeDescription}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className={labelClass}>Trạng thái ban đầu</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-800 disabled:opacity-60"
          >
            {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
            {submitting ? 'Đang tạo giải...' : 'Khởi tạo giải đấu'}
          </button>
        </div>
      </form>

      {/* Danh sách Giải đấu */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Giải đấu</th>
              <th className="px-4 py-3 font-semibold">Cơ sở / Môn</th>
              <th className="px-4 py-3 font-semibold">Thể thức</th>
              <th className="px-4 py-3 font-semibold">Ngày thi đấu</th>
              <th className="px-4 py-3 font-semibold">Số đội</th>
              <th className="px-4 py-3 font-semibold">Lệ phí</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Đang tải...</td>
              </tr>
            )}
            {!loading && tournaments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Chưa có giải đấu nào.</td>
              </tr>
            )}
            {!loading &&
              tournaments.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-red-600 shrink-0" />
                      <span>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="font-medium text-gray-800">{t.facilityName}</span>
                    <span className="block text-xs text-gray-400">{t.sportName}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{t.tournamentType}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {t.startDate} → {t.endDate}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
                      <Users size={12} /> {t.registeredTeamsCount}/{t.maxTeams}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {t.entryFee.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => void handleStatusChange(t.id, e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 focus:border-red-600 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void inspectTournament(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-red-200 hover:text-red-700"
                    >
                      <Eye size={14} /> Xem đội ({t.registeredTeamsCount})
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Panel xem danh sách Đội & VĐV của giải đã chọn */}
      {(detailLoading || selectedDetail) && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {detailLoading || !selectedDetail ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <LoaderCircle size={20} className="mr-2 animate-spin text-red-600" />
              Đang tải danh sách đội...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Danh sách đội đăng ký: {selectedDetail.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedDetail.facilityName} · {selectedDetail.sportName} · Đã đăng ký {selectedDetail.teams.length}/{selectedDetail.maxTeams} đội
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedDetail.prizeDescription && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  <Award size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{selectedDetail.prizeDescription}</span>
                </div>
              )}

              {selectedDetail.teams.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Chưa có đội nào đăng ký trong giải này.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedDetail.teams.map((team, idx) => (
                    <div key={team.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          Hạt giống #{team.seedNumber ?? idx + 1}: {team.teamName}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {team.status}
                        </span>
                      </div>
                      <ul className="mt-2.5 space-y-1.5 text-xs text-gray-600">
                        {team.athletes.map((a) => (
                          <li key={a.id} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              {a.isCaptain && <Crown size={13} className="text-amber-500" />}
                              <span className="font-medium text-gray-800">{a.fullName}</span>
                              <span className="text-gray-400">({a.phoneNumber})</span>
                            </span>
                            {a.skillRating !== null && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                {a.skillRating.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
