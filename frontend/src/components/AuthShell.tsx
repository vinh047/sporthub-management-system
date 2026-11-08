import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ShieldCheck, Trophy, Users } from 'lucide-react';
import Brand from './Brand';

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: 'Đặt sân trong 30 giây', text: 'Xem lịch trống theo thời gian thực, giữ chỗ 10 phút.' },
  { icon: Users, title: 'Buổi chơi Social', text: 'Tìm bạn chơi cùng trình độ, mua vé theo slot.' },
  { icon: Trophy, title: 'Giải đấu', text: 'Đăng ký đội, theo dõi nhánh đấu và tỉ số trực tiếp.' },
];

/** Khung trang đăng nhập / đăng ký: trái giới thiệu (đỏ), phải form (trắng) */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white bg-gradient-to-br from-red-700 via-red-800 to-[#3d0b0b]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-red-500/20 blur-3xl" />

        <Link to="/" className="relative w-fit">
          <Brand size="lg" light />
        </Link>

        <div className="relative space-y-8 max-w-md">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight">Chơi thể thao dễ hơn bao giờ hết</h2>
            <p className="mt-3 text-red-100/90">Một tài khoản cho đặt sân, buổi chơi Social, giải đấu và ưu đãi thành viên.</p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 grid place-items-center">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-sm text-red-100/80">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-red-100/80">
          <ShieldCheck size={16} /> Mật khẩu được mã hóa an toàn bằng BCrypt
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <Link to="/" className="lg:hidden inline-block mb-8">
            <Brand />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 mb-8 text-gray-500">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
