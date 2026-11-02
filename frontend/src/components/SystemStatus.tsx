import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleCheck, Database, LoaderCircle, RefreshCw, Server, TriangleAlert, WifiOff } from 'lucide-react';
import { CheckHealth } from '../api/checkHealth';
import type { HealthCheckResponse } from '../api/checkHealth';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: HealthCheckResponse; message: string }
  | { kind: 'offline' };

type StatusStyle = { label: string; icon: LucideIcon; tint: string; text: string };

const STATUS_STYLE: Record<string, StatusStyle> = {
  Healthy: { label: 'Hoạt động bình thường', icon: CircleCheck, tint: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
  Degraded: { label: 'Hoạt động hạn chế', icon: TriangleAlert, tint: 'bg-amber-50 text-amber-600', text: 'text-amber-600' },
  Unhealthy: { label: 'Đang gặp sự cố', icon: CircleAlert, tint: 'bg-red-50 text-red-600', text: 'text-red-600' },
};
const OFFLINE: StatusStyle = { label: 'Không kết nối được API', icon: WifiOff, tint: 'bg-red-50 text-red-600', text: 'text-red-600' };
const CHECKING: StatusStyle = { label: 'Đang kiểm tra...', icon: LoaderCircle, tint: 'bg-gray-100 text-gray-500', text: 'text-gray-500' };

const CHECK_NAMES: Record<string, string> = {
  database: 'Cơ sở dữ liệu (SQL Server)',
};

async function loadHealth(): Promise<HealthState> {
  try {
    const res = await CheckHealth.check();
    return res.data ? { kind: 'loaded', data: res.data, message: res.message ?? '' } : { kind: 'offline' };
  } catch {
    return { kind: 'offline' };
  }
}

/** Khối hiển thị kết quả GET /api/health (dùng ở trang chủ và trang Admin) */
export default function SystemStatus() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    loadHealth().then((state) => {
      if (active) setHealth(state);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRecheck = async () => {
    setHealth({ kind: 'loading' });
    setHealth(await loadHealth());
  };

  const overall =
    health.kind === 'loaded'
      ? STATUS_STYLE[health.data.status] ?? STATUS_STYLE.Unhealthy
      : health.kind === 'offline'
        ? OFFLINE
        : CHECKING;
  const OverallIcon = overall.icon;
  const loading = health.kind === 'loading';

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Server size={20} /></span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Trạng thái hệ thống</h2>
            <p className="text-sm text-gray-500">Kết quả từ API <code>/api/health</code></p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-red-200 hover:text-red-700 disabled:opacity-60"
          onClick={handleRecheck}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>
      </div>

      <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 ${overall.tint}`}>
        <OverallIcon size={20} className={loading ? 'animate-spin' : ''} />
        <span className="font-semibold">{overall.label}</span>
      </div>

      {health.kind === 'loaded' && (
        <>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {health.data.checks.map((check) => {
              const style = STATUS_STYLE[check.status] ?? STATUS_STYLE.Unhealthy;
              const Icon = style.icon;
              return (
                <li key={check.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Database size={18} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{CHECK_NAMES[check.name] ?? check.name}</p>
                      {check.description && <p className="text-sm text-gray-500">{check.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`flex items-center justify-end gap-1.5 text-sm font-semibold ${style.text}`}><Icon size={15} />{style.label}</p>
                    <p className="text-xs text-gray-500">{Math.round(check.durationMs)} ms</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Kiểm tra lúc {new Date(health.data.checkedAt).toLocaleTimeString('vi-VN')} · Tổng thời gian{' '}
            {Math.round(health.data.totalDurationMs)} ms
          </p>
        </>
      )}

      {health.kind === 'offline' && (
        <p className="text-sm text-gray-500">
          Không gọi được backend. Kiểm tra API đã chạy ở <code>http://localhost:5000</code> chưa
          (lệnh <code>pnpm dev:backend</code>).
        </p>
      )}
    </section>
  );
}
