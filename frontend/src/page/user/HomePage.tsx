import { Link } from 'react-router-dom';
import SystemStatus from '../../components/SystemStatus';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';

const FEATURES = [
  { title: 'Đặt sân online', description: 'Xem lịch sân theo thời gian thực, giữ chỗ 10 phút và thanh toán bằng VietQR.', color: 'bg-blue-500' },
  { title: 'Buổi chơi Social', description: 'Mua vé tham gia các buổi giao lưu phù hợp trình độ, không lo thiếu người.', color: 'bg-emerald-500' },
  { title: 'Giải đấu', description: 'Đăng ký đội, theo dõi nhánh đấu và tỉ số cập nhật trực tiếp.', color: 'bg-amber-500' },
  { title: 'Ưu đãi thành viên', description: 'Tích điểm mỗi lần đặt sân, lên hạng Bạc, Vàng, Kim Cương để được giảm giá.', color: 'bg-purple-500' },
];

const SPORTS = ['Cầu lông', 'Pickleball', 'Bóng đá mini', 'Tennis'];

const CURRENT_YEAR = new Date().getFullYear();

/** Trang chủ công khai (chưa cần đăng nhập) */
export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const myPage = isAuthenticated && user ? homePathFor(user.role) : null;

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">SportHub</span>
          <nav className="flex items-center gap-3">
            {myPage ? (
              <Link to={myPage} className="btn btn-primary text-sm">Vào trang của tôi</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium">Đăng nhập</Link>
                <Link to="/register" className="btn btn-primary text-sm">Đăng ký</Link>
              </>
            )}
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
          {!myPage && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn btn-primary px-6 py-3">Tạo tài khoản</Link>
              <Link to="/login" className="btn px-6 py-3 border border-border bg-surface text-text">
                Tôi đã có tài khoản
              </Link>
            </div>
          )}
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
