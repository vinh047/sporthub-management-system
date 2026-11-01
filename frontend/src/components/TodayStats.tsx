import { useEffect, useState } from 'react';
import { checkInApi } from '../api/checkInApi';
import type { CheckInItem } from '../api/checkInApi';
import { getErrorMessage } from '../api/errors';

const hhmm = (time: string) => time.slice(0, 5);

type State = { kind: 'loading' } | { kind: 'loaded'; rows: CheckInItem[] } | { kind: 'error'; message: string };

/** Thống kê khách đặt sân hôm nay của một cơ sở (dùng ở màn hình nhân viên và admin) */
export default function TodayStats({ facilityId, showUpcoming = true }: { facilityId: number; showUpcoming?: boolean }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    checkInApi
      .today(facilityId)
      .then((rows) => active && setState({ kind: 'loaded', rows }))
      .catch((err) => active && setState({ kind: 'error', message: getErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [facilityId]);

  if (state.kind === 'loading') return <p className="text-muted text-sm">Đang tải số liệu hôm nay...</p>;
  if (state.kind === 'error') return <p className="text-sm text-red-600">{state.message}</p>;

  const rows = state.rows;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
  const upcoming = rows.filter((r) => !r.checkedIn).slice(0, 5);

  const stats = [
    { label: 'Lượt đặt hôm nay', value: rows.length, color: 'text-text' },
    { label: 'Đã check-in', value: checkedIn, color: 'text-emerald-600' },
    { label: 'Chờ check-in', value: rows.length - checkedIn, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {showUpcoming && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Khách sắp đến</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Không còn khách chờ check-in.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((r) => (
                <li key={r.bookingDetailId} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{hhmm(r.startTime)}–{hhmm(r.endTime)}</span> · {r.courtName}
                  </span>
                  <span className="text-muted">{r.customerName} · {r.phone ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
