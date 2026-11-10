import TournamentBracketPanel from '../../components/tournament/TournamentBracketPanel';
import { tournamentStatusLabels, tournamentTeamStatusLabels } from '../../utils/tournamentStatus';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Crown, Eye, Plus, Trophy } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { facilityApi } from '../../api/facilityApi';
import type { Facility, Sport } from '../../api/facilityModels';
import { tournamentApi } from '../../api/tournamentApi';
import type { TournamentDetailDto, TournamentDto } from '../../api/tournamentApi';
import { Badge, Button, Dialog, Input, Select } from '../../components/ui';
import { EmptyState, LoadingState } from '../../components/shared';
import { useAuthStore } from '../../store/authStore';

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

  const [selectedDetail, setSelectedDetail] = useState<TournamentDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

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
    if (!facilityId) errs.facilityId = 'Chọn cơ sở tổ chức.';
    if (!sportId) errs.sportId = 'Chọn bộ môn thi đấu.';
    if (name.trim().length < 3 || name.trim().length > 150) {
      errs.name = 'Tên giải đấu phải từ 3 đến 150 ký tự.';
    }
    if (Number(entryFee) < 0 || Number(entryFee) > 100_000_000) {
      errs.entryFee = 'Lệ phí phải từ 0đ đến 100.000.000đ.';
    }
    if (!registrationDeadline || registrationDeadline.slice(0, 10) > startDate) {
      errs.registrationDeadline = 'Hạn chót đăng ký không được vượt quá ngày bắt đầu.';
    }
    if (!endDate || endDate < startDate) {
      errs.endDate = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;
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

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      setSelectedDetail(await tournamentApi.getById(id));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleChangeStatus = async (id: number, newStatus: string) => {
    try {
      const res = await tournamentApi.updateStatus(id, newStatus);
      toast.success(res.message ?? 'Đã cập nhật trạng thái giải đấu.');
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-border bg-surface-raised p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Trophy size={16} aria-hidden="true" /> SportHub Tournaments
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Khởi tạo & Quản lý Giải đấu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Tạo giải đấu mới, quản lý danh sách đội đăng ký, lệ phí và nhánh đấu trực tiếp.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-12 items-start">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-card border border-border bg-surface-raised p-5 xl:col-span-5"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground border-b border-border pb-3">
            <Plus size={18} className="text-primary" /> Khởi tạo giải đấu mới
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Cơ sở tổ chức *"
              value={facilityId}
              error={formErrors.facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>

            <Select
              label="Bộ môn *"
              value={sportId}
              error={formErrors.sportId}
              onChange={(e) => setSportId(e.target.value)}
            >
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.sportName}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Tên giải đấu *"
            value={name}
            error={formErrors.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Giải Cầu Lông Mở Rộng SportHub"
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Thể thức"
              value={tournamentType}
              onChange={(e) => setTournamentType(e.target.value)}
            >
              <option value="SingleElimination">Loại trực tiếp</option>
              <option value="RoundRobin">Đấu vòng tròn</option>
            </Select>

            <Select
              label="Số đội tối đa"
              value={maxTeams}
              onChange={(e) => setMaxTeams(Number(e.target.value))}
            >
              <option value={4}>4 đội</option>
              <option value={8}>8 đội</option>
              <option value={16}>16 đội</option>
              <option value={32}>32 đội</option>
            </Select>

            <Input
              label="Lệ phí / đội (VNĐ)"
              type="number"
              min={0}
              step={10000}
              value={entryFee}
              error={formErrors.entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Hạn đăng ký *"
              type="datetime-local"
              value={registrationDeadline}
              error={formErrors.registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
            />
            <Input
              label="Ngày bắt đầu *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Ngày kết thúc *"
              type="date"
              value={endDate}
              error={formErrors.endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Select
            label="Trạng thái ban đầu"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Điều lệ & Giải thưởng</label>
            <textarea
              rows={3}
              value={prizeDescription}
              onChange={(e) => setPrizeDescription(e.target.value)}
              placeholder="Nhập cơ cấu giải thưởng và điều lệ..."
              className="w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>

          <Button type="submit" loading={submitting} className="w-full">
            Khởi tạo Giải đấu
          </Button>
        </form>

        <section className="space-y-4 rounded-card border border-border bg-surface-raised p-5 xl:col-span-7">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">
              Danh sách Giải đấu ({tournaments.length})
            </h2>
          </div>

          {loading ? (
            <LoadingState label="Đang tải danh sách giải đấu…" />
          ) : tournaments.length === 0 ? (
            <EmptyState icon={Trophy} title="Chưa có giải đấu nào" description="Tạo giải đấu mới ở khung bên trái." />
          ) : (
            <div className="overflow-x-auto rounded-control border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface text-left uppercase text-muted">
                  <tr>
                    <th className="px-3.5 py-3 font-semibold">Giải đấu</th>
                    <th className="px-3.5 py-3 font-semibold">Ngày thi đấu</th>
                    <th className="px-3.5 py-3 font-semibold">Số đội</th>
                    <th className="px-3.5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((t) => (
                    <tr key={t.id} className="border-t border-border hover:bg-surface">
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-muted">
                          {t.facilityName} · {t.sportName} · {t.entryFee.toLocaleString('vi-VN')}đ
                        </p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-muted">
                        {t.startDate} → {t.endDate}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-foreground">
                        {t.registeredTeamsCount}/{t.maxTeams} đội
                      </td>
                      <td className="px-3.5 py-3">
                        <select
                          value={t.status}
                          onChange={(e) => void handleChangeStatus(t.id, e.target.value)}
                          className="rounded-control border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-foreground"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => void handleViewDetail(t.id)}>
                          <Eye size={13} /> Đội & Nhánh đấu
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedDetail ? selectedDetail.name : 'Chi tiết giải đấu'}
        description={selectedDetail ? `${selectedDetail.facilityName} · ${selectedDetail.sportName}` : undefined}
        size="xl"
      >
        {detailLoading || !selectedDetail ? (
          <LoadingState label="Đang tải danh sách đội và nhánh đấu…" />
        ) : (
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Danh sách đội đã đăng ký ({selectedDetail.teams.length}/{selectedDetail.maxTeams})
              </h3>
              {selectedDetail.teams.length === 0 ? (
                <p className="text-sm text-muted">Chưa có đội nào đăng ký.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedDetail.teams.map((team) => (
                    <div key={team.id} className="rounded-control border border-border bg-surface p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{team.teamName}</span>
                        <Badge variant={team.status === 'Approved' ? 'primary' : 'neutral'}>
                          {tournamentTeamStatusLabels[team.status] ?? tournamentStatusLabels[team.status] ?? team.status}
                        </Badge>
                      </div>
                      <ul className="space-y-1 border-t border-border pt-2 text-muted">
                        {team.athletes.map((a) => (
                          <li key={a.id} className="flex items-center gap-1.5 text-foreground">
                            {a.isCaptain && <Crown size={12} className="text-primary" />}
                            {a.fullName} {a.phoneNumber ? `(${a.phoneNumber})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="border-t border-border pt-4">
              <TournamentBracketPanel key={selectedDetail.id} tournamentId={selectedDetail.id} canManage />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
