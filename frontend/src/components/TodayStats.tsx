import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarCheck, CircleAlert, CircleCheck, Clock, Hourglass, Phone } from 'lucide-react';
import { checkInApi } from '../api/checkInApi';
import type { CheckInItem } from '../api/checkInApi';
import { getErrorMessage } from '../api/errors';

const hhmm = (time: string) => time.slice(0, 5);
const card = 'rounded-2xl border border-gray-100 bg-white shadow-sm';

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

  if (state.kind === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-3 animate-pulse">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className={`${card} flex items-center gap-3 p-5 text-sm text-red-700`}>
        <CircleAlert size={20} /> {state.message}
      </div>
    );
  }

  const rows = state.rows;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
  const upcoming = rows.filter((r) => !r.checkedIn).slice(0, 5);
  const rate = rows.length ? Math.round((checkedIn / rows.length) * 100) : 0;

  const stats: { label: string; value: number; icon: LucideIcon; tint: string; note: string }[] = [
    { label: 'Lượt đặt hôm nay', value: rows.length, icon: CalendarCheck, tint: 'bg-red-50 text-red-700', note: 'Tính cả đơn bán tại quầy' },
    { label: 'Đã check-in', value: checkedIn, icon: CircleCheck, tint: 'bg-emerald-50 text-emerald-600', note: `${rate}% khách đã đến` },
    { label: 'Chờ check-in', value: rows.length - checkedIn, icon: Hourglass, tint: 'bg-amber-50 text-amber-600', note: 'Quá 30 phút chưa đến sẽ bị đánh vắng' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tint, note }) => (
          <div key={label} className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}><Icon size={20} /></span>
            </div>
            <p className="mt-1 text-3xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{note}</p>
          </div>
        ))}
      </div>

      {showUpcoming && (
        <div className={card}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="font-semibold">Khách sắp đến</h3>
            <span className="text-xs text-gray-500">{upcoming.length} khách</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">Không còn khách chờ check-in.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((r) => (
                <li key={r.bookingDetailId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                      <Clock size={14} /> {hhmm(r.startTime)}–{hhmm(r.endTime)}
                    </span>
                    <span className="font-medium">{r.courtName}</span>
                  </span>
                  <span className="flex items-center gap-2 text-gray-500">
                    {r.customerName}
                    {r.phone && <span className="flex items-center gap-1"><Phone size={13} />{r.phone}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
