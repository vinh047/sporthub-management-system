import { useEffect } from 'react';
import { Badge, Button } from '../../components/ui';
import { useTournamentPayment } from '../../hooks/useTournamentPayment';
import type { TournamentDetailDto, TournamentTeamDto } from '../../api/tournamentApi';

interface Props {
  tournament: TournamentDetailDto;
  team: TournamentTeamDto;
  onTeamStatusChange?: (teamId: number, status: string) => void;
}

export default function TournamentTeamPayment({ tournament, team, onTeamStatusChange }: Props) {
  const { payment, loading, paying, error, loaded, pay, refresh } = useTournamentPayment(tournament.id, team.id);
  useEffect(() => {
    if (payment?.teamStatus && payment.teamStatus !== team.status)
      onTeamStatusChange?.(team.id, payment.teamStatus);
  }, [payment?.teamStatus, team.id, team.status, onTeamStatusChange]);
  const status = payment?.paymentStatus;
  const confirmed = status === 'Confirmed';
  const pending = status === 'Pending';
  const free = tournament.entryFee === 0 && !payment;
  const eligible = ['OpenReg', 'DrawCompleted', 'InProgress'].includes(tournament.status)
    && team.status !== 'Disqualified';
  const payable = !status || status === 'Pending' || status === 'Failed';

  return (
    <section aria-label={`Lệ phí đội ${team.teamName}`} className="mt-3 space-y-3 border-t border-border pt-3 text-sm text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Lệ phí: {(payment?.amount ?? tournament.entryFee).toLocaleString('vi-VN')} đ</span>
        <span role="status" aria-live="polite">
          {loading ? 'Đang kiểm tra thanh toán…' : loaded && (
            <Badge variant={confirmed || free ? 'success' : status === 'Failed' ? 'error' : 'warning'}>
              {confirmed ? 'Đã thanh toán' : free ? 'Miễn phí' : pending ? 'Chờ xác nhận' : status === 'Failed' ? 'Thanh toán thất bại' : status === 'Refunded' ? 'Đã hoàn tiền' : status ? 'Cần kiểm tra giao dịch' : 'Chưa thanh toán'}
            </Badge>
          )}
        </span>
      </div>
      {pending && <p className="text-muted">Hệ thống đang chờ xác nhận thanh toán. Nếu đã trả tiền, hãy kiểm tra trạng thái; nếu chưa, bạn có thể tiếp tục giao dịch còn hạn. Giao dịch hết hạn cần được đối soát.</p>}
      {error && <p role="alert" className="text-error">{error}</p>}
      {!eligible && !confirmed && !free && <p className="text-muted">Đã đóng thanh toán hoặc đội không còn đủ điều kiện. Vui lòng liên hệ ban tổ chức nếu cần hỗ trợ.</p>}
      <div className="flex flex-wrap gap-2">
        {eligible && !free && payable && (
          <Button type="button" size="sm" loading={paying} disabled={loading || !loaded} onClick={() => void pay()}>
            {paying ? 'Đang chuyển đến VNPay…' : pending ? 'Tiếp tục với VNPay' : status === 'Failed' ? 'Thanh toán lại qua VNPay' : 'Thanh toán qua VNPay'}
          </Button>
        )}
        {!free && <Button type="button" size="sm" variant="outline" loading={loading} disabled={paying} onClick={refresh}>Kiểm tra trạng thái</Button>}
      </div>
    </section>
  );
}
