import TournamentBracketPanel from '../../components/tournament/TournamentBracketPanel';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building, Calendar, Crown, FileText, Plus, Swords, Trash2, Trophy, UserPlus, Users,
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
import TournamentTeamPayment from './TournamentTeamPayment';
import { Badge, Button, Dialog, Input, Select } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import { EmptyState, LoadingState } from '../../components/shared';
import { tournamentStatusLabels, tournamentTeamStatusLabels } from '../../utils/tournamentStatus';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  Draft: 'neutral',
  OpenReg: 'primary',
  DrawCompleted: 'neutral',
  InProgress: 'primary',
  Finished: 'neutral',
};

const FORMAT_LABEL: Record<string, string> = {
  SingleElimination: 'Loại trực tiếp (Knockout)',
  RoundRobin: 'Đấu vòng tròn (Round Robin)',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
};

export default function TournamentsPage({ embedded = false }: { embedded?: boolean }) {
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

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'rules' | 'teams' | 'matches'>('rules');
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<TournamentDetailDto | null>(null);

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<TournamentDto | null>(null);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<Array<{ name: string; phone: string }>>([{ name: '', phone: '' }]);
  const [agreedRules, setAgreedRules] = useState(true);
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [teamNameError, setTeamNameError] = useState<string | undefined>();
  const [memberErrors, setMemberErrors] = useState<Record<number, { name?: string; phone?: string }>>({});
  const [agreedError, setAgreedError] = useState<string | null>(null);
  const [submitErrorBanner, setSubmitErrorBanner] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const result = params.get('paymentResult');
    if (!result) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setPaymentNotice(
        result === 'processing'
          ? 'Đã quay về từ VNPay. Xem trạng thái thanh toán trong thẻ đội của bạn.'
          : 'Giao dịch VNPay chưa thành công hoặc đã bị hủy. Vui lòng kiểm tra trạng thái của đội.',
      );
      const tournamentId = Number(params.get('tournamentId'));
      const teamId = Number(params.get('teamId'));
      if (!isAuthenticated || tournamentId <= 0 || teamId <= 0) return;
      setSelectedDetail(null);
      setDetailModalOpen(true);
      setDetailTab('teams');
      setDetailLoading(true);
      void tournamentApi
        .getById(tournamentId)
        .then((detail) => {
          if (!active) return;
          setSelectedDetail(detail);
          params.delete('paymentResult');
          params.delete('tournamentId');
          params.delete('teamId');
          navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
        })
        .catch((err) => {
          if (!active) return;
          setPaymentNotice(getErrorMessage(err));
          setDetailModalOpen(false);
        })
        .finally(() => active && setDetailLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, location.pathname, location.search, navigate]);

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

  const openDetailModal = async (tournamentId: number, initialTab: 'rules' | 'teams' | 'matches' = 'rules') => {
    setDetailTab(initialTab);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      setSelectedDetail(await tournamentApi.getById(tournamentId));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openRegisterModal = (tournament: TournamentDto) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đăng ký đội tham gia giải đấu.');
      navigate('/login');
      return;
    }
    setRegisterTarget(tournament);
    setTeamName('');
    setMembers([{ name: '', phone: '' }]);
    setAgreedRules(true);
    setTeamNameError(undefined);
    setMemberErrors({});
    setAgreedError(null);
    setSubmitErrorBanner(null);
    setRegisterModalOpen(true);
  };

  const handleMemberChange = (idx: number, field: 'name' | 'phone', value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
    setMemberErrors((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: undefined } }));
    setSubmitErrorBanner(null);
  };

  const validateRegisterForm = (): boolean => {
    let valid = true;
    const trimmedTeam = teamName.trim();
    if (!trimmedTeam || trimmedTeam.length < 2 || trimmedTeam.length > 80) {
      setTeamNameError('Tên đội thi đấu phải từ 2 đến 80 ký tự.');
      valid = false;
    } else {
      setTeamNameError(undefined);
    }

    const nextMemberErrors: Record<number, { name?: string; phone?: string }> = {};
    const seenPhones = new Set<string>();
    const phoneRegex = /^0\d{8,10}$/;

    members.forEach((m, idx) => {
      const cleanName = m.name.trim();
      const cleanPhone = m.phone.trim().replace(/\s+/g, '');
      const rowErr: { name?: string; phone?: string } = {};

      if (cleanName && !cleanPhone) {
        rowErr.phone = 'Nhập SĐT cho vận động viên này.';
        valid = false;
      }
      if (cleanName && (cleanName.length < 2 || cleanName.length > 80)) {
        rowErr.name = 'Họ tên VĐV từ 2–80 ký tự.';
        valid = false;
      }
      if (cleanPhone) {
        if (!phoneRegex.test(cleanPhone)) {
          rowErr.phone = 'SĐT không hợp lệ (9–11 chữ số, bắt đầu bằng 0).';
          valid = false;
        } else if (seenPhones.has(cleanPhone)) {
          rowErr.phone = 'SĐT bị trùng trong đội.';
          valid = false;
        } else {
          seenPhones.add(cleanPhone);
        }
      }
      if (rowErr.name || rowErr.phone) nextMemberErrors[idx] = rowErr;
    });

    setMemberErrors(nextMemberErrors);
    setAgreedError(agreedRules ? null : 'Vui lòng đồng ý với điều lệ giải đấu.');
    if (!agreedRules) valid = false;
    return valid;
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registerTarget || !validateRegisterForm()) return;
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
      toast.success(res.message ?? 'Đăng ký đội thành công!');
      setRegisterModalOpen(false);
      navigate('/player/tournaments?tab=mine');
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
    <div className="space-y-6">
      {paymentNotice && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface p-4 text-sm text-foreground">
          <p>{paymentNotice}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentNotice(null)}>Đóng</Button>
        </div>
      )}

      {embedded && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">Khám phá giải đấu</h2>
            <p className="mt-1 text-sm text-muted">Chọn giải phù hợp với đội của bạn.</p>
          </div>
          <span className="text-sm text-muted">{loading ? 'Đang tải…' : `${filteredTournaments.length} giải đấu`}</span>
        </div>
      )}

      {/* Bộ lọc Giải đấu */}
      <section className="grid gap-3 rounded-card border border-border bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Tìm tên giải đấu"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nhập tên giải đấu..."
        />
        <Select label="Cơ sở tổ chức" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
          <option value="">Tất cả cơ sở</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
        <Select label="Bộ môn thi đấu" value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Tất cả môn thể thao</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.sportName}</option>
          ))}
        </Select>
        <Select label="Trạng thái giải" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="OpenReg">Đang mở đăng ký</option>
          <option value="InProgress">Đang diễn ra</option>
          <option value="DrawCompleted">Đã bốc thăm</option>
          <option value="Finished">Đã kết thúc</option>
        </Select>
      </section>

      {/* Danh sách Giải đấu */}
      {loading ? (
        <LoadingState label="Đang tải danh sách giải đấu…" />
      ) : filteredTournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Không tìm thấy giải đấu nào phù hợp"
          description="Hãy thử đổi bộ lọc cơ sở, môn thể thao hoặc từ khóa tìm kiếm."
        />
      ) : (
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTournaments.map((t) => {
            const isFull = t.registeredTeamsCount >= t.maxTeams;
            const canRegister = t.status === 'OpenReg' && !isFull;
            const progressPct = Math.min(100, Math.round((t.registeredTeamsCount / Math.max(1, t.maxTeams)) * 100));

            return (
              <article
                key={t.id}
                className="flex min-w-0 flex-col justify-between rounded-card border border-border bg-surface-raised p-5 transition-colors hover:border-primary/30"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Badge variant="primary">
                      <Swords size={13} className="mr-1" /> {t.sportName}
                    </Badge>
                    <Badge variant={STATUS_BADGE[t.status] ?? 'neutral'}>
                      {tournamentStatusLabels[t.status] ?? t.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Building size={15} /> {t.facilityName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-control border border-border bg-surface p-3.5 text-xs">
                    <div>
                      <span className="block text-muted">Thể thức</span>
                      <span className="font-semibold text-foreground">
                        {FORMAT_LABEL[t.tournamentType] ?? t.tournamentType}
                      </span>
                    </div>
                    <div>
                      <span className="block text-muted">Lệ phí / đội</span>
                      <span className="font-bold text-primary">
                        {t.entryFee > 0 ? `${t.entryFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <Calendar size={14} />
                      <span>Thi đấu: <strong className="text-foreground">{formatDate(t.startDate)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <span>Hạn ĐK: <strong className="text-foreground">{formatDate(t.registrationDeadline)}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-medium text-muted">
                        <Users size={14} /> Số đội đã đăng ký
                      </span>
                      <span className="font-bold text-foreground">
                        {t.registeredTeamsCount} / {t.maxTeams} đội
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-pill bg-surface border border-border">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => void openDetailModal(t.id, 'rules')}
                  >
                    <FileText size={15} /> Chi tiết ({t.registeredTeamsCount})
                  </Button>
                  {canRegister ? (
                    <Button type="button" className="flex-1" onClick={() => openRegisterModal(t)}>
                      <UserPlus size={15} /> Đăng ký đội
                    </Button>
                  ) : (
                    <Badge variant="neutral" className="py-2 px-3">
                      {isFull ? 'Đã đủ đội' : 'Đóng đăng ký'}
                    </Badge>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog Chi tiết Giải đấu */}
      <Dialog
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={selectedDetail?.name ?? 'Chi tiết giải đấu'}
        description={selectedDetail ? `${selectedDetail.facilityName} · ${selectedDetail.sportName}` : undefined}
        size={detailTab === 'matches' ? 'xl' : 'lg'}
      >
        {detailLoading || !selectedDetail ? (
          <LoadingState label="Đang tải chi tiết giải đấu…" />
        ) : (
          <div className="space-y-5">
            <nav className="grid grid-cols-3 gap-2 rounded-card border border-border bg-surface p-1.5 text-xs font-semibold">
              {[
                { key: 'rules', label: 'Điều lệ & Giải thưởng' },
                { key: 'teams', label: `Đội đăng ký (${selectedDetail.teams.length}/${selectedDetail.maxTeams})` },
                { key: 'matches', label: `Lịch & Nhánh đấu (${selectedDetail.matches.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDetailTab(item.key as typeof detailTab)}
                  className={`rounded-control py-2 px-3 transition-colors ${
                    detailTab === item.key
                      ? 'border border-primary/20 bg-surface-raised text-primary shadow-design-sm'
                      : 'text-muted hover:bg-surface-raised'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {detailTab === 'rules' && (
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 rounded-control border border-border bg-surface p-4 sm:grid-cols-2">
                  <p><span className="text-muted">Cơ sở:</span> <strong>{selectedDetail.facilityName}</strong></p>
                  <p><span className="text-muted">Bộ môn:</span> <strong>{selectedDetail.sportName}</strong></p>
                  <p><span className="text-muted">Thể thức:</span> <strong>{FORMAT_LABEL[selectedDetail.tournamentType] ?? selectedDetail.tournamentType}</strong></p>
                  <p><span className="text-muted">Lệ phí:</span> <strong className="text-primary">{selectedDetail.entryFee.toLocaleString('vi-VN')} đ / đội</strong></p>
                  <p><span className="text-muted">Ngày thi đấu:</span> <strong>{formatDate(selectedDetail.startDate)} – {formatDate(selectedDetail.endDate)}</strong></p>
                  <p><span className="text-muted">Hạn đăng ký:</span> <strong>{formatDate(selectedDetail.registrationDeadline)}</strong></p>
                </div>

                <div className="rounded-control border border-border bg-surface p-4">
                  <h4 className="font-semibold text-foreground">Điều lệ & Cơ cấu giải thưởng</h4>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted">
                    {selectedDetail.prizeDescription || 'Áp dụng luật thi đấu tiêu chuẩn của hệ thống cụm sân SportHub.'}
                  </p>
                </div>
              </div>
            )}

            {detailTab === 'teams' && (
              <div className="space-y-3">
                {selectedDetail.teams.length === 0 ? (
                  <p className="rounded-control border border-border bg-surface p-6 text-center text-sm text-muted">
                    Chưa có đội nào đăng ký.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedDetail.teams.map((team) => (
                      <div key={team.id} className="rounded-control border border-border bg-surface-raised p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {team.seedNumber != null ? `#${team.seedNumber} · ` : ''}{team.teamName}
                          </span>
                          <Badge variant={team.status === 'Approved' ? 'primary' : 'neutral'}>
                            {tournamentTeamStatusLabels[team.status] ?? team.status}
                          </Badge>
                        </div>
                        <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted">
                          {team.athletes.map((a) => (
                            <li key={a.id} className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-foreground">
                                {a.isCaptain && <Crown size={13} className="text-primary" />}
                                {a.fullName} {a.isCaptain ? '(Đội trưởng)' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {isAuthenticated &&
                          team.athletes.some((a) => a.isCaptain && a.userId === user?.userId) && (
                            <TournamentTeamPayment
                              tournament={selectedDetail}
                              team={team}
                              onTeamStatusChange={(teamId, status) =>
                                setSelectedDetail((d) =>
                                  d
                                    ? {
                                        ...d,
                                        teams: d.teams.map((item) =>
                                          item.id === teamId ? { ...item, status } : item,
                                        ),
                                      }
                                    : d,
                                )
                              }
                            />
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'matches' && (
              <TournamentBracketPanel key={selectedDetail.id} tournamentId={selectedDetail.id} />
            )}
          </div>
        )}
      </Dialog>

      {/* Dialog Đăng ký Đội */}
      <Dialog
        open={registerModalOpen && registerTarget !== null}
        onOpenChange={setRegisterModalOpen}
        title={registerTarget ? `Đăng ký đội · ${registerTarget.name}` : 'Đăng ký đội'}
        description={registerTarget ? `${registerTarget.facilityName} · ${registerTarget.sportName}` : undefined}
        size="lg"
      >
        {registerTarget && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface p-3.5 text-sm">
              <span>
                Đội trưởng: <strong>{user?.fullName}</strong> ({user?.phoneNumber})
              </span>
              <Badge variant={captainEligible ? 'primary' : 'error'}>
                Uy tín: {captainRep}/100
              </Badge>
            </div>

            {submitErrorBanner && (
              <p role="alert" className="rounded-control border border-error bg-error/10 p-3 text-sm text-error">
                {submitErrorBanner}
              </p>
            )}

            <Input
              label="Tên đội thi đấu *"
              value={teamName}
              error={teamNameError}
              onChange={(e) => {
                setTeamName(e.target.value);
                setTeamNameError(undefined);
              }}
              placeholder="VD: Saigon Smashers"
            />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Vận động viên cùng đội ({members.length}/8)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    members.length < 8 && setMembers((prev) => [...prev, { name: '', phone: '' }])
                  }
                >
                  <Plus size={14} /> Thêm VĐV
                </Button>
              </div>

              {members.map((member, idx) => {
                const rowErr = memberErrors[idx];
                return (
                  <div key={idx} className="grid gap-2 sm:grid-cols-12 items-start">
                    <div className="sm:col-span-5">
                      <Input
                        value={member.name}
                        error={rowErr?.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        placeholder={`Họ tên VĐV #${idx + 2}`}
                      />
                    </div>
                    <div className="flex items-start gap-2 sm:col-span-7">
                      <div className="flex-1">
                        <Input
                          type="tel"
                          value={member.phone}
                          error={rowErr?.phone}
                          onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                          placeholder={`SĐT VĐV #${idx + 2} (09xxxxxxxx)`}
                        />
                      </div>
                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-control border border-border bg-surface px-4 py-3 text-sm">
              <span className="text-muted">Lệ phí đăng ký đội:</span>
              <strong className="text-base text-primary">
                {registerTarget.entryFee > 0
                  ? `${registerTarget.entryFee.toLocaleString('vi-VN')} đ`
                  : 'Miễn phí'}
              </strong>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={agreedRules}
                onChange={(e) => {
                  setAgreedRules(e.target.checked);
                  if (e.target.checked) setAgreedError(null);
                }}
                className="mt-0.5 rounded border-border text-primary"
              />
              <span>Tôi đã đọc điều lệ giải đấu và cam kết đội có mặt đúng giờ thi đấu.</span>
            </label>
            {agreedError && <p className="text-xs text-error">{agreedError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRegisterModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submittingTeam} disabled={!captainEligible}>
                Xác nhận đăng ký đội
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );

  if (embedded || isInsidePlayerLayout) return content;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicSiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">{content}</main>
      <PublicSiteFooter />
    </div>
  );
}
