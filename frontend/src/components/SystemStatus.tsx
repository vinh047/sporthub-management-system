import { useEffect, useState } from 'react';
import { CheckHealth } from '../api/checkHealth';
import type { HealthCheckResponse } from '../api/checkHealth';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: HealthCheckResponse; message: string }
  | { kind: 'offline' };

const STATUS_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  Healthy: { label: 'Hoạt động bình thường', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Degraded: { label: 'Hoạt động hạn chế', dot: 'bg-amber-500', text: 'text-amber-600' },
  Unhealthy: { label: 'Đang gặp sự cố', dot: 'bg-red-500', text: 'text-red-600' },
};

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
        ? { label: 'Không kết nối được API', dot: 'bg-red-500', text: 'text-red-600' }
        : { label: 'Đang kiểm tra...', dot: 'bg-gray-400 animate-pulse', text: 'text-muted' };

  return (
    <section className="bg-surface border border-border rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Trạng thái hệ thống</h2>
          <p className="text-sm text-muted">Kết quả từ API <code>/api/health</code></p>
        </div>
        <button
          className="btn btn-primary text-sm disabled:opacity-60"
          onClick={handleRecheck}
          disabled={health.kind === 'loading'}
        >
          {health.kind === 'loading' ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-block w-3 h-3 rounded-full ${overall.dot}`} />
        <span className={`font-semibold ${overall.text}`}>{overall.label}</span>
      </div>

      {health.kind === 'loaded' && (
        <>
          <ul className="divide-y divide-border border border-border rounded-lg bg-background">
            {health.data.checks.map((check) => {
              const style = STATUS_STYLE[check.status] ?? STATUS_STYLE.Unhealthy;
              return (
                <li key={check.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium text-text">{CHECK_NAMES[check.name] ?? check.name}</p>
                    {check.description && <p className="text-sm text-muted">{check.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${style.text}`}>{style.label}</p>
                    <p className="text-xs text-muted">{Math.round(check.durationMs)} ms</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted mt-3">
            Kiểm tra lúc {new Date(health.data.checkedAt).toLocaleTimeString('vi-VN')} · Tổng thời gian{' '}
            {Math.round(health.data.totalDurationMs)} ms
          </p>
        </>
      )}

      {health.kind === 'offline' && (
        <p className="text-sm text-muted">
          Không gọi được backend. Kiểm tra API đã chạy ở <code>http://localhost:5000</code> chưa
          (lệnh <code>pnpm dev:backend</code>).
        </p>
      )}
    </section>
  );
}
