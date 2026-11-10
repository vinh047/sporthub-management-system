import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, LayoutGrid, Trophy, Users } from 'lucide-react';
import { PublicSiteFooter, PublicSiteHeader } from '../../components/PublicSiteChrome';
import { EmptyState } from '../../components/shared';
import { useAuthStore } from '../../store/authStore';
import TournamentsPage from './TournamentsPage';
import MyTournamentsPage from './MyTournamentsPage';

export function LegacyMyTournamentsRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('tab', 'mine');
  return <Navigate replace to={`/player/tournaments?${params}`} />;
}

export default function TournamentHubPage() {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const insidePlayer = location.pathname.startsWith('/player');
  const params = new URLSearchParams(location.search);
  const mine = params.get('tab') === 'mine' || params.has('paymentResult');
  const basePath = insidePlayer ? '/player/tournaments' : '/tournaments';
  const content = (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-border bg-surface-raised p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Trophy size={16} aria-hidden="true" /> SportHub Tournaments</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sẵn sàng cho trận đấu tiếp theo?</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">Tìm giải đấu phù hợp, lập đội tranh tài và theo dõi hành trình thi đấu của bạn tại một nơi.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted"><Users className="text-primary" size={24} aria-hidden="true" /><span>Đăng ký đội<br /><strong className="font-semibold text-foreground">Cùng nhau thi đấu</strong></span></div>
      </header>
      <nav aria-label="Chuyên mục giải đấu" className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface p-2">
        {[
          { active: !mine, to: basePath, icon: LayoutGrid, label: 'Khám phá giải đấu', description: 'Tìm giải và đăng ký đội' },
          { active: mine, to: `${basePath}?tab=mine`, icon: Trophy, label: 'Giải đấu của tôi', description: 'Quản lý đội, lệ phí và lịch đấu' },
        ].map(({ active, to, icon: Icon, label, description }) => (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-control border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:p-4 ${active ? 'border-primary/20 bg-surface-raised text-primary shadow-design-sm' : 'border-transparent text-muted hover:bg-surface-raised'}`}>
            <Icon size={20} className="hidden shrink-0 sm:block" aria-hidden="true" />
            <span className="min-w-0"><span className="block text-sm font-semibold sm:text-base">{label}</span><span className="mt-1 hidden text-xs text-muted sm:block">{description}</span></span>
            {active && <ArrowUpRight size={18} aria-hidden="true" className="ml-auto hidden shrink-0 sm:block" />}
          </Link>
        ))}
      </nav>
      {mine ? authenticated ? <MyTournamentsPage embedded /> : (
        <EmptyState icon={Trophy} title="Đăng nhập để xem giải đấu của bạn" description="Theo dõi đội đã đăng ký, thanh toán và lịch thi đấu."
          action={<Link className="font-semibold text-primary underline" to="/login">Đăng nhập</Link>} />
      ) : <TournamentsPage embedded />}
    </div>
  );
  return insidePlayer ? content : (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{content}</main>
      <PublicSiteFooter />
    </div>
  );
}
