import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { playerRatingApi, type PlayerRatingDashboard } from '../../api/playerRatingApi';

const dateText = (value: string) => new Date(value).toLocaleString('vi-VN');
export default function PlayerRatingPage() {
  const [data, setData] = useState<PlayerRatingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    playerRatingApi.mine(controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể tải lịch sử điểm.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Trình độ & uy tín</h1>
          <p className="text-sm text-gray-600">Điểm và lịch sử được lấy từ hệ thống, không dùng dữ liệu giả.</p></div>
        <Link to="/player/social" className="text-red-700 hover:underline">Xem buổi Social</Link>
      </div>
      {loading && <p role="status" className="text-gray-600">Đang tải hồ sơ...</p>}
      {error && !loading && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}
        <button type="button" onClick={() => setRetry(n => n + 1)} className="ml-3 underline">Thử lại</button></div>}
      {!loading && !error && data && <>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Điểm trình độ', data.numericSkillRating.toFixed(2) + ' / 5.00'],
            ['Cấp độ', data.skillLevel],
            ['Điểm uy tín', String(data.reputationScore) + ' / 100'],
            ['Trận / No-show', `${data.totalMatchesPlayed} / ${data.totalNoShows}`],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-xl font-bold text-red-700">{value}</p></div>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Lịch sử trình độ</h2>
            {data.skillHistory.length === 0 ? <p className="text-gray-500">Chưa có trận đấu nào được tính điểm.</p> :
              <ul className="divide-y divide-gray-100">{data.skillHistory.map(row => <li key={row.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2"><span className="font-medium">{row.oldRating.toFixed(2)} → {row.newRating.toFixed(2)}</span>
                  <span className={row.delta >= 0 ? 'text-green-700' : 'text-red-700'}>{row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}</span></div>
                <p className="text-gray-600">{row.changeReason}</p><p className="text-xs text-gray-400">{dateText(row.createdAt)}</p>
              </li>)}</ul>}
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Lịch sử uy tín</h2>
            {data.reputationHistory.length === 0 ? <p className="text-gray-500">Chưa có thay đổi điểm uy tín.</p> :
              <ul className="divide-y divide-gray-100">{data.reputationHistory.map(row => <li key={row.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2"><span className="text-gray-700">{row.reason}</span>
                  <span className={row.scoreDelta >= 0 ? 'text-green-700' : 'text-red-700'}>{row.scoreDelta > 0 ? '+' : ''}{row.scoreDelta}</span></div>
                <p className="text-xs text-gray-400">{dateText(row.createdAt)}</p>
              </li>)}</ul>}
          </section>
        </div>
      </>}
    </section>
  );
}
