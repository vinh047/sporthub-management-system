import { useRef, useState } from 'react';
import { tournamentBracketApi } from '../../api/tournamentBracketApi';
import type { BracketMatch } from '../../api/tournamentBracketApi';
import { getErrorMessage } from '../../api/errors';
import { useTournamentBracket } from '../../hooks/useTournamentBracket';
import { Badge, Button, Dialog, Input } from '../ui';
import { EmptyState, LoadingState } from '../shared';
import BracketView from './BracketView';

export default function TournamentBracketPanel({ tournamentId, canManage = false }: { tournamentId: number; canManage?: boolean }) {
  const { bracket, error, connected, accept, refresh } = useTournamentBracket(tournamentId);
  const [selected, setSelected] = useState<{ match: BracketMatch; version: number } | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const busy = useRef(false);
  const run = async (generate: boolean) => {
    if (busy.current || !bracket) return;
    if (!generate && (!selected || first === '' || second === '' || !Number.isInteger(Number(first)) || !Number.isInteger(Number(second)) || Number(first) === Number(second))) {
      setActionError('Nhập điểm nguyên cho cả hai đội; set kết thúc không được hòa.'); return;
    }
    busy.current = true; setSaving(true); setActionError(null);
    try {
      const result = generate ? await tournamentBracketApi.generate(tournamentId)
        : await tournamentBracketApi.recordSet(tournamentId, selected!.match.id, selected!.match.sets.length + 1, Number(first), Number(second), selected!.version);
      accept(result); setSelected(null); setConfirmGenerate(false);
    } catch (err) { setActionError(getErrorMessage(err)); refresh(); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="space-y-4" aria-label="Nhánh đấu trực tiếp">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-foreground">Nhánh đấu trực tiếp</h2><p className="mt-1 text-sm text-muted">Điểm từng set và đội đi tiếp được cập nhật tự động.</p></div>
      <div className="flex items-center gap-2"><Badge variant={connected ? 'success' : 'warning'}>{connected ? 'Trực tiếp' : 'Đang kết nối · tự tải lại'}</Badge><Button size="sm" variant="outline" onClick={refresh}>Tải lại</Button></div>
    </div>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {!bracket ? <LoadingState label="Đang tải nhánh đấu…" /> : bracket.tournamentType !== 'SingleElimination'
      ? <EmptyState title="Giải vòng tròn" description="Sơ đồ nhánh hiện áp dụng cho giải loại trực tiếp." />
      : bracket.matches.length === 0 ? <EmptyState title="Chưa có nhánh đấu" description="Ban tổ chức sẽ chốt các đội đủ điều kiện và sinh nhánh."
        action={canManage && bracket.status === 'OpenReg' ? <Button onClick={() => { setActionError(null); setConfirmGenerate(true); }}>Sinh nhánh đấu</Button> : undefined} />
      : <BracketView bracket={bracket} onScore={canManage && bracket.status !== 'Finished' ? (match) => { setSelected({ match, version: bracket.version }); setFirst(''); setSecond(''); setActionError(null); } : undefined} />}
    <Dialog open={confirmGenerate} onOpenChange={(open) => { if (!saving) setConfirmGenerate(open); }} title="Chốt đội và sinh nhánh đấu">
      <div className="space-y-4"><p className="text-sm text-muted">Chỉ đội đã duyệt và hoàn tất lệ phí được vào nhánh. Đội chưa đủ điều kiện bị bỏ qua. Thao tác này đóng đăng ký, xếp hạt giống theo thứ tự hiện có và tự cấp BYE; không sinh lại sau khi chốt.</p>
        {actionError && <p role="alert" className="text-error">{actionError}</p>}<Button loading={saving} onClick={() => void run(true)}>Xác nhận sinh nhánh</Button></div>
    </Dialog>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !saving) setSelected(null); }} title={`Nhập điểm set ${(selected?.match.sets.length ?? 0) + 1}`}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run(false); }}>
        <p className="text-sm text-muted">Nhập kết quả set đã kết thúc theo luật môn thi đấu. Kết quả đã xác nhận sẽ được khóa.</p>
        <Input label={selected?.match.team1Name ?? 'Đội 1'} type="number" min={0} max={999} step={1} required value={first} onChange={(e) => setFirst(e.target.value)} disabled={saving} />
        <Input label={selected?.match.team2Name ?? 'Đội 2'} type="number" min={0} max={999} step={1} required value={second} onChange={(e) => setSecond(e.target.value)} disabled={saving} />
        {selected && bracket && selected.version !== bracket.version && <p role="alert" className="text-warning">Nhánh vừa được cập nhật. Đóng hộp nhập và mở lại trận để lấy dữ liệu mới nhất.</p>}
        {actionError && <p role="alert" className="text-error">{actionError}</p>}
        <Button type="submit" loading={saving} disabled={selected?.version !== bracket?.version}>Xác nhận điểm set</Button>
      </form>
    </Dialog>
  </section>;
}
