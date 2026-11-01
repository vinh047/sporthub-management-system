import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckHealth } from '../../api/checkHealth';
import type { HealthCheckResponse } from '../../api/checkHealth';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: HealthCheckResponse; message: string }
  | { kind: 'offline' };

const FEATURES = [
  { title: 'Đặt sân online', description: 'Xem lịch sân theo thời gian thực, giữ chỗ 10 phút và thanh toán bằng VietQR.', color: 'bg-blue-500' },
  { title: 'Buổi chơi Social', description: 'Mua vé tham gia các buổi giao lưu phù hợp trình độ, không lo thiếu người.', color: 'bg-emerald-500' },
  { title: 'Giải đấu', description: 'Đăng ký đội, theo dõi nhánh đấu và tỉ số cập nhật trực tiếp.', color: 'bg-amber-500' },
  { title: 'Ưu đãi thành viên', description: 'Tích điểm mỗi lần đặt sân, lên hạng Bạc, Vàng, Kim Cương để được giảm giá.', color: 'bg-purple-500' },
];

const SPORTS = ['Cầu lông', 'Pickleball', 'Bóng đá mini', 'Tennis'];

const CURRENT_YEAR = new Date().getFullYear();

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

function SystemStatus() {
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">SportHub</span>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium">Đăng nhập</Link>
            <Link to="/register" className="btn btn-primary text-sm">Đăng ký</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12 animate-fade-in">
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Đặt sân thể thao nhanh, không lo trùng lịch</h1>
          <p className="text-muted text-lg mb-6">
            Chuỗi cụm sân đa cơ sở: xem lịch trống theo thời gian thực, đặt sân trong vài giây,
            tham gia buổi chơi Social và giải đấu.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {SPORTS.map((sport) => (
              <span key={sport} className="px-3 py-1 rounded-full bg-surface border border-border text-sm">
                {sport}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn btn-primary px-6 py-3">Tạo tài khoản</Link>
            <Link to="/login" className="btn px-6 py-3 border border-border bg-surface text-text">
              Tôi đã có tài khoản
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-surface border border-border rounded-xl p-5">
              <span className={`block w-10 h-1.5 rounded-full mb-4 ${feature.color}`} />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted">{feature.description}</p>
            </div>
          ))}
        </section>

        <SystemStatus />
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-muted text-center">
          © {CURRENT_YEAR} SportHub · Đồ án Nhóm 11
        </div>
      </footer>
    </div>
  );
}
