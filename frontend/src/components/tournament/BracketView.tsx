import { Trophy } from 'lucide-react';
import type { BracketMatch, TournamentBracket } from '../../api/tournamentBracketApi';
import { Button } from '../ui';

export default function BracketView({ bracket, onScore }: { bracket: TournamentBracket; onScore?: (match: BracketMatch) => void }) {
  const rounds = Math.max(0, ...bracket.matches.map((match) => match.roundNumber));
  const firstRoundCount = bracket.matches.filter((match) => match.roundNumber === 1).length;
  const top = (match: BracketMatch) => (2 ** (match.roundNumber - 1) - 1) * 96 + (match.matchOrder - 1) * 192 * 2 ** (match.roundNumber - 1);
  const left = (match: BracketMatch) => (match.roundNumber - 1) * 280;
  const roundLabel = (round: number) => round === rounds ? 'Chung kết' : round === rounds - 1 ? 'Bán kết' : round === rounds - 2 ? 'Tứ kết' : `Vòng ${round}`;
  return (
    <div className="space-y-3">
      {bracket.championTeamName && <p role="status" className="flex items-center gap-2 rounded-control bg-success/10 p-3 font-semibold text-success"><Trophy size={20} aria-hidden="true" /> Vô địch: {bracket.championTeamName}</p>}
      <p className="text-xs text-muted">Thắng 2 trong 3 set · BYE: miễn đấu · Cuộn ngang để xem các vòng tiếp theo.</p>
      <div role="region" aria-label={`Sơ đồ nhánh đấu ${bracket.name}`} tabIndex={0}
        className="max-h-[70vh] overflow-auto rounded-card border border-border bg-surface p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
        <div className="relative" style={{ width: Math.max(240, rounds * 280 - 40), height: Math.max(160, firstRoundCount * 192 - 32) + 48 }}>
          {Array.from({ length: rounds }, (_, index) => <h3 key={index} className="absolute text-sm font-semibold text-primary" style={{ left: index * 280, top: 0 }}>{roundLabel(index + 1)}</h3>)}
          <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-12 h-full w-full overflow-visible text-border">
            {bracket.matches.map((match) => {
              const next = bracket.matches.find((candidate) => candidate.id === match.nextMatchId);
              if (!next) return null;
              const x = left(match) + 240, y = top(match) + 80, parentY = top(next) + 80;
              return <path key={match.id} d={`M ${x} ${y} H ${x + 20} V ${parentY} H ${left(next)}`} fill="none" stroke="currentColor" strokeWidth="2" />;
            })}
          </svg>
          {bracket.matches.map((match) => {
            const ready = match.team1Id != null && match.team2Id != null && !['Completed', 'Walkover'].includes(match.status);
            return <article key={match.id} aria-label={`${roundLabel(match.roundNumber)}, trận ${match.matchOrder}`}
              className="absolute flex flex-col justify-between rounded-control border border-border bg-surface-raised p-3 text-sm shadow-design-sm"
              style={{ left: left(match), top: top(match) + 48, width: 240, height: 160 }}>
              <div className="flex justify-between gap-2 text-xs text-muted"><span>Trận {match.matchOrder}</span><span>{match.status === 'Walkover' ? 'BYE' : match.status === 'Completed' ? 'Kết thúc' : match.status === 'InProgress' ? 'Đang đấu' : 'Chờ thi đấu'}</span></div>
              {[1, 2].map((slot) => {
                const id = slot === 1 ? match.team1Id : match.team2Id;
                const name = slot === 1 ? match.team1Name : match.team2Name;
                const source = bracket.matches.find((candidate) => candidate.nextMatchId === match.id && candidate.nextSlot === slot);
                return <div key={slot} className={`flex items-center justify-between gap-2 ${id != null && id === match.winnerTeamId ? 'font-semibold text-success' : 'text-foreground'}`}>
                  <span className="truncate" title={name ?? undefined}>{name ?? (match.roundNumber === 1 ? 'BYE' : `Thắng trận ${source?.matchOrder ?? '?'}, vòng ${match.roundNumber - 1}`)}</span>
                  <span className="flex shrink-0 gap-2 font-mono" aria-label={`Điểm các set của ${name ?? 'đội chưa xác định'}`}>{match.sets.map((set) => <span key={set.setNumber}>{slot === 1 ? set.team1Points : set.team2Points}</span>)}</span>
                </div>;
              })}
              {onScore && ready ? <Button size="sm" variant="outline" onClick={() => onScore(match)}>Nhập set {match.sets.length + 1}</Button>
                : <span className="text-xs text-muted">{match.winnerTeamId ? 'Đã xác định đội thắng' : ready ? 'Chờ cập nhật điểm' : 'Chờ đội từ vòng trước'}</span>}
            </article>;
          })}
        </div>
      </div>
    </div>
  );
}
