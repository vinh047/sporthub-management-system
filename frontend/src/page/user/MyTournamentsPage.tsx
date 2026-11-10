import TournamentBracketPanel from '../../components/tournament/TournamentBracketPanel';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Crown, Trophy } from 'lucide-react';
import { tournamentApi } from '../../api/tournamentApi';
import type { TournamentDetailDto } from '../../api/tournamentApi';
import { getErrorMessage } from '../../api/errors';
import { Badge, Button, Dialog, Select } from '../../components/ui';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/shared';
import { useAuthStore } from '../../store/authStore';
import { tournamentStatusLabels, tournamentTeamStatusLabels } from '../../utils/tournamentStatus';
import TournamentTeamPayment from './TournamentTeamPayment';

const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN');

export default function MyTournamentsPage({ embedded = false }: { embedded?: boolean }) {
  const userId = useAuthStore((state) => state.user?.userId);
  const [tournaments, setTournaments] = useState<TournamentDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [bracketId, setBracketId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentResult = searchParams.get('paymentResult');

  useEffect(() => {
    const controller = new AbortController();
    void tournamentApi.getMine(controller.signal).then((data) => {
      if (!controller.signal.aborted) setTournaments(data);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [revision, userId]);

  const refresh = () => {
    setError(null);
    setLoading(true);
    setRevision((value) => value + 1);
  };
  const updateTeamStatus = useCallback((teamId: number, status: string) => {
    setTournaments((previous) => previous.map((tournament) => ({
      ...tournament,
      teams: tournament.teams.map((team) => team.id === teamId ? { ...team, status } : team),
    })));
  }, []);
  const visible = tournaments.filter((tournament) => filter === 'all'
    || (filter === 'Finished' ? tournament.status === 'Finished' : tournament.teams.some((team) => team.status === filter)));

  return (
    <div className="space-y-6">
      {embedded ? <div><h2 className="text-xl font-bold text-foreground">Giải đấu của tôi</h2><p className="mt-1 text-sm text-muted">Quản lý đội, hoàn tất lệ phí và theo dõi lịch thi đấu.</p></div> : <PageHeader title="Giải đấu của tôi" description="Theo dõi đội đã đăng ký, thanh toán lệ phí và lịch thi đấu của bạn."
        actions={<Link to="/player/tournaments" className="font-semibold text-primary underline underline-offset-4">Khám phá giải đấu</Link>} />}
      {paymentResult && (
        <div role="status" className="space-y-2 rounded-control border border-border bg-surface p-4 text-sm text-foreground">
          <p>{paymentResult === 'processing'
            ? 'Đã quay về từ VNPay. Hệ thống đang kiểm tra xác nhận thanh toán; đội được duyệt khi giao dịch thành công.'
            : paymentResult === 'failed'
              ? 'Giao dịch chưa thành công hoặc đã bị hủy. Kiểm tra trạng thái trước khi thanh toán lại.'
              : 'Không xác thực được kết quả trả về. Vui lòng kiểm tra trạng thái giao dịch của đội.'}</p>
          <Button variant="ghost" size="sm" onClick={() => {
            const next = new URLSearchParams(searchParams);
            ['paymentResult', 'tournamentId', 'teamId'].forEach((key) => next.delete(key));
            setSearchParams(next, { replace: true });
          }}>Đóng thông báo</Button>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select label="Lọc giải đấu" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Tất cả đã tham gia</option>
          <option value="Registered">Chờ thanh toán</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Disqualified">Đã bị loại</option>
          <option value="Finished">Đã kết thúc</option>
        </Select>
        <Button variant="outline" loading={loading} onClick={refresh}>Làm mới</Button>
      </div>
      {loading ? <LoadingState label="Đang tải giải đấu của bạn…" /> : error ? (
        <ErrorState message={error} action={<Button onClick={refresh}>Thử lại</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Trophy} title={tournaments.length ? 'Không có giải đấu phù hợp bộ lọc' : 'Bạn chưa tham gia giải đấu nào'}
          description="Đăng ký đội hoặc tham gia cùng đội trưởng để theo dõi giải đấu tại đây." />
      ) : <div className="grid items-start gap-5 lg:grid-cols-2">{visible.map((tournament) => (
        <article key={tournament.id} className="space-y-4 rounded-card border border-border bg-surface-raised p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">{tournament.name}</h2>
              <p className="mt-1 text-sm text-muted">{tournament.facilityName} · {tournament.sportName}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted"><CalendarDays size={16} aria-hidden="true" />
                {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</p>
            </div>
            <Badge variant="info">{tournamentStatusLabels[tournament.status] ?? tournament.status}</Badge>
          </div>
          {tournament.teams.map((team) => {
            const captain = team.athletes.find((athlete) => athlete.isCaptain);
            const isCaptain = captain?.userId === userId;
            return (
              <section key={team.id} className="space-y-3 border-t border-border pt-4" aria-label={`Đội ${team.teamName}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{team.teamName}</h3>
                  <Badge variant={team.status === 'Approved' ? 'success' : team.status === 'Disqualified' ? 'error' : 'warning'}>
                    {tournamentTeamStatusLabels[team.status] ?? team.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted">Đăng ký ngày {formatDate(team.registrationDate)} · {isCaptain ? 'Bạn là đội trưởng' : 'Bạn là thành viên'}</p>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
                  {team.athletes.map((athlete) => <li key={athlete.id} className="flex items-center gap-2">
                    {athlete.isCaptain && <Crown size={16} aria-hidden="true" className="text-warning" />}
                    {athlete.fullName}{athlete.isCaptain ? ' · Đội trưởng' : ''}
                  </li>)}
                </ul>
                {isCaptain ? <TournamentTeamPayment tournament={tournament} team={team} onTeamStatusChange={updateTeamStatus} /> : (
                  <p className="text-sm text-muted">Lệ phí đội: {tournament.entryFee.toLocaleString('vi-VN')} đ. Đội trưởng {captain?.fullName ?? ''} phụ trách thanh toán.</p>
                )}
              </section>
            );
          })}
          <Button variant="outline" onClick={() => setBracketId(tournament.id)}>Xem nhánh đấu trực tiếp</Button>
          <section className="space-y-2 border-t border-border pt-4" aria-label="Lịch thi đấu của đội">
            <h3 className="font-semibold text-foreground">Lịch thi đấu của đội</h3>
            {tournament.matches.length === 0 ? <p className="text-sm text-muted">Chưa có lịch thi đấu được công bố cho đội của bạn.</p> : (
              <ul className="space-y-3 text-sm text-foreground">
                {tournament.matches.map((match) => <li key={match.id}>
                  <p className="font-medium">Vòng {match.roundNumber}: {match.team1Name ?? 'Chờ xác định'} – {match.team2Name ?? 'Chờ xác định'}</p>
                  <p className="text-muted">{match.scheduledStartTime ? new Date(match.scheduledStartTime).toLocaleString('vi-VN') : 'Chưa xếp giờ'} · {match.courtName ?? 'Chưa xếp sân'}</p>
                  {match.scoreSummary && <p>Kết quả: {match.scoreSummary}</p>}
                </li>)}
              </ul>
            )}
          </section>
        </article>
      ))}</div>}
      <Dialog open={bracketId !== null} title="Nhánh đấu trực tiếp" onOpenChange={(open) => { if (!open) setBracketId(null); }} size="xl">
        {bracketId !== null && <TournamentBracketPanel key={bracketId} tournamentId={bracketId} />}
      </Dialog>
    </div>
  );
}
