import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Award, Building, Calendar, CheckCircle2, CircleCheck, Clock, Crown, FileText,
  LoaderCircle, MapPin, Plus, Search, ShieldAlert, ShieldCheck, Swords, Trash2,
  Trophy, UserPlus, Users, X,
} from 'lucide-react';
import { PublicSiteFooter, PublicSiteHeader } from '../../components/PublicSiteChrome';
import { authApi } from '../../api/authApi';
import type { MeResponse } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { tournamentApi } from '../../api/tournamentApi';
import type { TournamentDetailDto, TournamentDto } from '../../api/tournamentApi';
import { useAuthStore } from '../../store/authStore';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  Draft: { label: 'Sắp công bố', badgeClass: 'bg-gray-100 text-gray-700' },
  OpenReg: { label: 'Đang mở đăng ký', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  DrawCompleted: { label: 'Đã bốc thăm nhánh đấu', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' },
  InProgress: { label: 'Đang diễn ra', badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200' },
  Finished: { label: 'Đã kết thúc', badgeClass: 'bg-slate-100 text-slate-600' },
};

const FORMAT_LABEL: Record<string, string> = {
  SingleElimination: 'Loại trực tiếp (Knockout)',
  RoundRobin: 'Đấu vòng tròn (Round Robin)',
};

const ROUND_LABEL: Record<number, string> = {
  1: 'Vòng loại / Vòng 1',
  2: 'Tứ kết',
  3: 'Bán kết',
  4: 'Chung kết',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
};

export default function TournamentsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isInsidePlayerLayout = location.pathname.startsWith('/player');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [meProfile, setMeProfile] = useState<MeResponse | null>(null);

  // Modal Xem điều lệ, Danh sách đội & Lịch thi đấu
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'rules' | 'teams' | 'matches'>('rules');
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<TournamentDetailDto | null>(null);

  // Modal Đăng ký đội
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<TournamentDto | null>(null);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<Array<{ name: string; phone: string }>>([{ name: '', phone: '' }]);
  const [agreedRules, setAgreedRules] = useState(true);
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);
  const [memberErrors, setMemberErrors] = useState<Record<number, { name?: string; phone?: string }>>({});
  const [agreedError, setAgreedError] = useState<string | null>(null);
  const [submitErrorBanner, setSubmitErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([facilityApi.getFacilities(), facilityApi.getSports()])
      .then(([facs, sps]) => {
        setFacilities(facs);
        setSports(sps);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setMeProfile(null);
      return;
    }
    void authApi
      .me()
      .then((res) => setMeProfile(res.data ?? null))
      .catch(() => setMeProfile(null));
  }, [isAuthenticated]);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tournamentApi.getAll({
        facilityId: facilityId ? Number(facilityId) : undefined,
        sportId: sportId ? Number(sportId) : undefined,
        status: statusFilter || undefined,
      });
      setTournaments(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [facilityId, sportId, statusFilter]);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const filteredTournaments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.facilityName.toLowerCase().includes(q) ||
        t.sportName.toLowerCase().includes(q),
    );
  }, [tournaments, searchQuery]);

  const summaryStats = useMemo(() => {
    const openCount = tournaments.filter((t) => t.status === 'OpenReg').length;
    const totalTeams = tournaments.reduce((sum, t) => sum + t.registeredTeamsCount, 0);
    return {
      total: tournaments.length,
      openCount,
      totalTeams,
    };
  }, [tournaments]);

  const openDetailModal = async (tournamentId: number, initialTab: 'rules' | 'teams' | 'matches' = 'rules') => {
    setDetailTab(initialTab);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await tournamentApi.getById(tournamentId);
      setSelectedDetail(detail);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openRegisterModal = (tournament: TournamentDto) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập tài khoản để đăng ký đội tham gia giải đấu.');
      navigate('/login');
      return;
    }
    setRegisterTarget(tournament);
    setTeamName('');
    setMembers([{ name: '', phone: '' }]);
    setAgreedRules(true);
    setTeamNameError(null);
    setMemberErrors({});
    setAgreedError(null);
    setSubmitErrorBanner(null);
    setRegisterModalOpen(true);
  };

  const handleAddPhoneField = () => {
    if (members.length >= 8) {
      toast.error('Mỗi đội chỉ được thêm tối đa 8 vận động viên đi kèm.');
      return;
    }
    setMembers((prev) => [...prev, { name: '', phone: '' }]);
  };
  const handleRemovePhoneField = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
    setMemberErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };
  const handleMemberChange = (idx: number, field: 'name' | 'phone', value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
    setMemberErrors((prev) => {
      if (!prev[idx]?.[field]) return prev;
      return {
        ...prev,
        [idx]: { ...prev[idx], [field]: undefined },
      };
    });
    setSubmitErrorBanner(null);
  };

  const validateRegisterForm = (): boolean => {
    let valid = true;
    const trimmedTeam = teamName.trim();
    if (!trimmedTeam) {
      setTeamNameError('Vui lòng nhập tên đội thi đấu.');
      valid = false;
    } else if (trimmedTeam.length < 2 || trimmedTeam.length > 80) {
      setTeamNameError('Tên đội thi đấu phải từ 2 đến 80 ký tự.');
      valid = false;
    } else {
      setTeamNameError(null);
    }

    const nextMemberErrors: Record<number, { name?: string; phone?: string }> = {};
    const seenPhones = new Set<string>();
    const phoneRegex = /^0\d{8,10}$/;

    members.forEach((m, idx) => {
      const cleanName = m.name.trim();
      const cleanPhone = m.phone.trim().replace(/\s+/g, '');
      const rowErr: { name?: string; phone?: string } = {};

      if (cleanName && !cleanPhone) {
        rowErr.phone = 'Vui lòng nhập số điện thoại cho vận động viên này.';
        valid = false;
      }

      if (cleanName && (cleanName.length < 2 || cleanName.length > 80)) {
        rowErr.name = 'Họ tên VĐV phải từ 2 đến 80 ký tự.';
        valid = false;
      }

      if (cleanPhone) {
        if (!phoneRegex.test(cleanPhone)) {
          rowErr.phone = 'SĐT không hợp lệ (cần 9–11 chữ số, bắt đầu bằng số 0).';
          valid = false;
        } else if (seenPhones.has(cleanPhone)) {
          rowErr.phone = 'Số điện thoại này bị trùng với vận động viên khác trong đội.';
          valid = false;
        } else {
          seenPhones.add(cleanPhone);
        }
      }

      if (rowErr.name || rowErr.phone) {
        nextMemberErrors[idx] = rowErr;
      }
    });

    setMemberErrors(nextMemberErrors);

    if (!agreedRules) {
      setAgreedError('Vui lòng xác nhận đồng ý với điều lệ giải đấu.');
      valid = false;
    } else {
      setAgreedError(null);
    }

    return valid;
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registerTarget) return;
    setSubmitErrorBanner(null);
    if (!validateRegisterForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin đăng ký đội.');
      return;
    }
    setSubmittingTeam(true);
    try {
      const validMembers = members
        .map((m) => ({ name: m.name.trim(), phone: m.phone.trim().replace(/\s+/g, '') }))
        .filter((m) => m.phone.length > 0);
      const res = await tournamentApi.registerTeam(registerTarget.id, {
        teamName: teamName.trim(),
        memberPhones: validMembers.map((m) => m.phone),
        memberNames: validMembers.map((m) => m.name),
      });
      toast.success(res.message ?? 'Đăng ký đội tham gia giải đấu thành công!');
      setRegisterModalOpen(false);
      await loadTournaments();
      // Mở ngay modal chi tiết ở tab Danh sách Đội để người dùng thấy đội vừa đăng ký
      await openDetailModal(registerTarget.id, 'teams');
    } catch (err) {
      const msg = getErrorMessage(err);
      setSubmitErrorBanner(msg);
      toast.error(msg);
    } finally {
      setSubmittingTeam(false);
    }
  };

  const captainRep = meProfile?.player?.reputationScore ?? 100;
  const captainEligible = captainRep >= 60;

  const content = (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Cổng thông tin Giải đấu */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-800 to-[#2b0808] p-8 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-100">
              <Trophy size={14} /> Cổng thông tin Giải đấu SportHub · UC18 & UC19
            </span>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Cổng thông tin Giải đấu & Đăng ký Đội
            </h1>
            <p className="mt-2 text-sm text-red-100/90 sm:text-base">
              Xem danh sách các giải đấu đang mở, tra cứu điều lệ & giải thưởng, lập đội cùng đồng đội và theo dõi lịch thi đấu trực tiếp.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs text-center">
            <div className="px-2">
              <p className="text-2xl font-extrabold">{summaryStats.total}</p>
              <p className="text-[11px] text-red-100/80">Giải đấu</p>
            </div>
            <div className="border-x border-white/15 px-3">
              <p className="text-2xl font-extrabold text-emerald-300">{summaryStats.openCount}</p>
              <p className="text-[11px] text-red-100/80">Đang mở ĐK</p>
            </div>
            <div className="px-2">
              <p className="text-2xl font-extrabold">{summaryStats.totalTeams}</p>
              <p className="text-[11px] text-red-100/80">Đội tham dự</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bộ lọc Giải đấu */}
      <section className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-gray-500">Tìm tên giải đấu</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên giải đấu..."
              className={`${inputClass} pl-9`}
            />
          </div>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-gray-500">Cơ sở tổ chức</span>
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputClass}>
            <option value="">Tất cả cơ sở</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-gray-500">Bộ môn thi đấu</span>
          <select value={sportId} onChange={(e) => setSportId(e.target.value)} className={inputClass}>
            <option value="">Tất cả môn thể thao</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.sportName}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-gray-500">Trạng thái giải</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
            <option value="">Tất cả trạng thái</option>
            <option value="OpenReg">Đang mở đăng ký</option>
            <option value="InProgress">Đang diễn ra</option>
            <option value="DrawCompleted">Đã bốc thăm</option>
            <option value="Finished">Đã kết thúc</option>
          </select>
        </label>
      </section>

      {/* Danh sách Giải đấu */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <LoaderCircle size={24} className="mr-2 animate-spin text-red-600" />
          Đang tải danh sách giải đấu...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Trophy size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-800">Không tìm thấy giải đấu nào phù hợp</p>
          <p className="mt-1 text-sm text-gray-500">Hãy thử đổi bộ lọc cơ sở, môn thể thao hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredTournaments.map((t) => {
            const meta = STATUS_META[t.status] ?? { label: t.status, badgeClass: 'bg-gray-100 text-gray-700' };
            const isFull = t.registeredTeamsCount >= t.maxTeams;
            const canRegister = t.status === 'OpenReg' && !isFull;
            const progressPct = Math.min(100, Math.round((t.registeredTeamsCount / Math.max(1, t.maxTeams)) * 100));

            return (
              <article
                key={t.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                      <Swords size={14} /> {t.sportName}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <Building size={15} className="text-gray-400" /> {t.facilityName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3.5 text-xs text-gray-600">
                    <div>
                      <span className="block text-gray-400">Thể thức thi đấu</span>
                      <span className="font-semibold text-gray-800">
                        {FORMAT_LABEL[t.tournamentType] ?? t.tournamentType}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400">Lệ phí đăng ký / đội</span>
                      <span className="font-bold text-red-700">
                        {t.entryFee > 0 ? `${t.entryFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      <span>Thi đấu: <strong>{formatDate(t.startDate)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      <span>Hạn ĐK: <strong>{formatDate(t.registrationDeadline)}</strong></span>
                    </div>
                  </div>

                  {t.prizeDescription && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-900">
                      <Award size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      <p className="line-clamp-2">{t.prizeDescription}</p>
                    </div>
                  )}

                  {/* Tiến độ số đội đăng ký */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-medium text-gray-600">
                        <Users size={14} /> Số đội đã đăng ký
                      </span>
                      <span className="font-bold text-gray-900">
                        {t.registeredTeamsCount} / {t.maxTeams} đội ({t.maxTeams - t.registeredTeamsCount} suất trống)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-600' : 'bg-emerald-500'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void openDetailModal(t.id, 'rules')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-red-200 hover:text-red-700"
                  >
                    <FileText size={16} /> Xem điều lệ & Đội ({t.registeredTeamsCount})
                  </button>

                  {canRegister ? (
                    <button
                      type="button"
                      onClick={() => openRegisterModal(t)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-800"
                    >
                      <UserPlus size={16} /> Đăng ký đội
                    </button>
                  ) : (
                    <span className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-medium text-gray-500">
                      {isFull ? 'Đã đủ số đội' : 'Đã đóng đăng ký'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Xem Điều lệ, Danh sách Đội & Lịch thi đấu */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Cổng thông tin Giải đấu · Điều lệ & Danh sách Đội
                </p>
                <h3 className="mt-1 text-2xl font-extrabold text-gray-900">
                  {selectedDetail?.name ?? 'Đang tải...'}
                </h3>
                {selectedDetail && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={14} className="text-red-600" />
                    {selectedDetail.facilityName} — {selectedDetail.facilityAddress || 'Hệ thống sân SportHub'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading || !selectedDetail ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <LoaderCircle size={22} className="mr-2 animate-spin text-red-600" />
                Đang tải chi tiết giải đấu...
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                {/* Tabs chuyển đổi trong Modal */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDetailTab('rules')}
                      className={`rounded-lg px-3.5 py-2 transition ${
                        detailTab === 'rules' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      Điều lệ & Giải thưởng
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('teams')}
                      className={`rounded-lg px-3.5 py-2 transition ${
                        detailTab === 'teams' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      Đội đã đăng ký ({selectedDetail.teams.length}/{selectedDetail.maxTeams})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('matches')}
                      className={`rounded-lg px-3.5 py-2 transition ${
                        detailTab === 'matches' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      Lịch thi đấu ({selectedDetail.matches.length})
                    </button>
                  </div>

                  {selectedDetail.status === 'OpenReg' &&
                    selectedDetail.registeredTeamsCount < selectedDetail.maxTeams && (
                      <button
                        type="button"
                        onClick={() => {
                          setDetailModalOpen(false);
                          openRegisterModal(selectedDetail);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-800"
                      >
                        <UserPlus size={14} /> Đăng ký đội tham gia
                      </button>
                    )}
                </div>

                {detailTab === 'rules' && (
                  <div className="space-y-4">
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                      <p><span className="text-gray-500">Cơ sở tổ chức:</span> <strong>{selectedDetail.facilityName}</strong></p>
                      <p><span className="text-gray-500">Bộ môn:</span> <strong>{selectedDetail.sportName}</strong></p>
                      <p><span className="text-gray-500">Thể thức:</span> <strong>{FORMAT_LABEL[selectedDetail.tournamentType] ?? selectedDetail.tournamentType}</strong></p>
                      <p><span className="text-gray-500">Lệ phí tham dự:</span> <strong className="text-red-700">{selectedDetail.entryFee.toLocaleString('vi-VN')} đ / đội</strong></p>
                      <p><span className="text-gray-500">Ngày thi đấu:</span> <strong>{formatDate(selectedDetail.startDate)} – {formatDate(selectedDetail.endDate)}</strong></p>
                      <p><span className="text-gray-500">Hạn chót đăng ký:</span> <strong>{formatDate(selectedDetail.registrationDeadline)}</strong></p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-amber-900">
                        <Award size={18} className="text-amber-600" /> Cơ cấu giải thưởng & Nội dung điều lệ
                      </h4>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-950">
                        {selectedDetail.prizeDescription ||
                          'Giải đấu áp dụng luật thi đấu tiêu chuẩn của Liên đoàn và hệ thống cụm sân SportHub.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-4 space-y-2 text-xs text-gray-600">
                      <h5 className="font-bold text-sm text-gray-900">Quy định chung dành cho Đội & Vận động viên</h5>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>Đội trưởng đăng ký trực tuyến phải có <strong>Điểm uy tín (Reputation) ≥ 60</strong>.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>Mỗi vận động viên chỉ được phép có tên trong <strong>1 đội duy nhất</strong> của cùng giải đấu.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>Các đội có mặt tại quầy Lễ tân cơ sở trước giờ thi đấu tối thiểu <strong>15 phút</strong> để làm thủ tục điểm danh.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {detailTab === 'teams' && (
                  <div className="space-y-3">
                    {selectedDetail.teams.length === 0 ? (
                      <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                        Chưa có đội nào đăng ký. Hãy là đội đầu tiên ghi danh tham dự!
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedDetail.teams.map((team, index) => (
                          <div key={team.id} className="rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">
                                Hạt giống #{team.seedNumber ?? index + 1} · {team.teamName}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {team.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              Đăng ký ngày {formatDate(team.registrationDate)}
                            </p>
                            <ul className="mt-2.5 space-y-1.5 border-t border-gray-100 pt-2 text-xs text-gray-600">
                              {team.athletes.map((a) => (
                                <li key={a.id} className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    {a.isCaptain && <Crown size={13} className="text-amber-500" />}
                                    <span className={a.isCaptain ? 'font-semibold text-gray-900' : ''}>
                                      {a.fullName}
                                    </span>
                                    {a.isCaptain && (
                                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                        Đội trưởng
                                      </span>
                                    )}
                                  </span>
                                  {a.skillRating !== null && (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                      ELO {a.skillRating.toFixed(2)} {a.skillLevel ? `· ${a.skillLevel}` : ''}
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

                {detailTab === 'matches' && (
                  <div className="space-y-3">
                    {selectedDetail.matches.length === 0 ? (
                      <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                        Ban tổ chức chưa công bố nhánh đấu / lịch thi đấu cho giải này.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDetail.matches.map((m) => (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3.5 text-sm"
                          >
                            <div>
                              <span className="text-xs font-bold uppercase text-red-700">
                                {ROUND_LABEL[m.roundNumber] ?? `Vòng ${m.roundNumber}`} · Trận #{m.matchOrder}
                              </span>
                              <p className="mt-1 font-semibold text-gray-900">
                                {m.team1Name ?? 'Chờ xác định'} <span className="text-gray-400">vs</span>{' '}
                                {m.team2Name ?? 'Chờ xác định'}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Sân: <strong>{m.courtName ?? 'Chưa xếp sân'}</strong> · Giờ đấu:{' '}
                                {m.scheduledStartTime ? new Date(m.scheduledStartTime).toLocaleString('vi-VN') : 'Chưa xếp giờ'}
                              </p>
                            </div>
                            <div className="text-right">
                              {m.scoreSummary ? (
                                <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                                  {m.scoreSummary}
                                </span>
                              ) : (
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                  {m.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form Đăng ký Đội / Vận động viên */}
      {registerModalOpen && registerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Form đăng ký đội tham dự · UC19
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-gray-900">
                  {registerTarget.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {registerTarget.facilityName} · {registerTarget.sportName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
              {/* Thông tin Đội trưởng & Kiểm tra Uy tín */}
              <div
                className={`rounded-xl p-3.5 text-xs space-y-1.5 border ${
                  captainEligible
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <p className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-500" />
                    Đội trưởng: {user?.fullName} ({user?.phoneNumber})
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-bold shadow-2xs">
                    Uy tín: {captainRep}/100
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  {captainEligible ? (
                    <>
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>Đủ điều kiện làm Đội trưởng (Điểm uy tín ≥ 60).</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} className="text-red-600 shrink-0" />
                      <span>Điểm uy tín của bạn dưới 60 nên không đủ điều kiện đăng ký giải đấu.</span>
                    </>
                  )}
                </p>
              </div>

              {submitErrorBanner && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {submitErrorBanner}
                </div>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-700">Tên đội thi đấu *</span>
                <input
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (teamNameError) setTeamNameError(null);
                    setSubmitErrorBanner(null);
                  }}
                  placeholder="Nhập tên đội (VD: Saigon Dragon Smashers)"
                  className={`${inputClass} ${teamNameError ? 'border-red-500 bg-red-50/30' : ''}`}
                />
                {teamNameError && (
                  <p className="text-xs font-medium text-red-600">{teamNameError}</p>
                )}
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Danh sách Vận động viên cùng đội ({members.length}/8)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPhoneField}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Plus size={14} /> Thêm VĐV
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Nhập số điện thoại (9–11 số, bắt đầu bằng 0) và họ tên (tuỳ chọn) của các thành viên trong đội. Nếu SĐT chưa có tài khoản, hệ thống sẽ tự động khởi tạo hồ sơ VĐV.
                </p>

                {members.map((member, idx) => {
                  const rowErr = memberErrors[idx];
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                          placeholder={`Họ tên VĐV #${idx + 2} (tuỳ chọn)`}
                          className={`${inputClass} sm:col-span-5 ${rowErr?.name ? 'border-red-500 bg-red-50/30' : ''}`}
                        />
                        <div className="flex items-center gap-2 sm:col-span-7">
                          <input
                            type="tel"
                            value={member.phone}
                            onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                            placeholder={`SĐT VĐV #${idx + 2} (VD: 0976732457)`}
                            className={`${inputClass} ${rowErr?.phone ? 'border-red-500 bg-red-50/30' : ''}`}
                          />
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhoneField(idx)}
                              className="rounded-xl border border-gray-200 p-2.5 text-gray-400 hover:border-red-200 hover:text-red-600"
                              title="Xóa VĐV"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {(rowErr?.name || rowErr?.phone) && (
                        <p className="text-xs font-medium text-red-600">
                          {rowErr.name ?? rowErr.phone}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-600">Lệ phí đăng ký đội:</span>
                <span className="text-lg font-extrabold text-red-700">
                  {registerTarget.entryFee > 0
                    ? `${registerTarget.entryFee.toLocaleString('vi-VN')} đ`
                    : 'Miễn phí'}
                </span>
              </div>

              <div className="space-y-1">
                <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedRules}
                    onChange={(e) => {
                      setAgreedRules(e.target.checked);
                      if (e.target.checked) setAgreedError(null);
                    }}
                    className="mt-0.5 rounded border-gray-300 text-red-700 focus:ring-red-600"
                  />
                  <span>
                    Tôi đã đọc, hiểu rõ điều lệ giải đấu và cam kết các vận động viên trong đội có mặt đúng giờ thi đấu.
                  </span>
                </label>
                {agreedError && (
                  <p className="text-xs font-medium text-red-600">{agreedError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam || !captainEligible}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-800 disabled:opacity-60"
                >
                  {submittingTeam ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
                  {submittingTeam ? 'Đang gửi đăng ký...' : 'Xác nhận đăng ký đội'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isInsidePlayerLayout) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Khu vực người chơi · Giải đấu</span>
          <Link to="/player" className="font-medium text-red-700 hover:underline">
            ← Về trang tổng quan
          </Link>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      <PublicSiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10">{content}</main>
      <PublicSiteFooter />
    </div>
  );
}
