import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import Brand from "./Brand";
import { useAuthStore } from "../store/authStore";
import { homePathFor } from "../utils/roleHome";
import { notifyComingSoon } from "../utils/comingSoon";
import type { FeatureKey } from "../utils/comingSoon";

const CONTACT = {
  name: "Hệ thống đặt sân SportHub",
  hotline: "0900 000 000",
  email: "lienhe@sporthub.vn",
};

const CURRENT_YEAR = new Date().getFullYear();

const NAV: {
  label: string;
  href?: string;
  to?: string;
  feature?: FeatureKey;
}[] = [
  { label: "Trang chủ", href: "#top" },
  { label: "Tìm sân", href: "#quick-search" },
  { label: "Lịch đặt sân", to: "/player/booking" },
  { label: "Social", feature: "social" },
  { label: "Giải đấu", to: "/tournaments" },
  { label: "Ưu đãi", to: "/vouchers" },
  { label: "Hướng dẫn", href: "#huong-dan" },
  { label: "Liên hệ", href: "#lien-he" },
];

export function PublicSiteHeader() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const linkClass =
    "px-3 py-2 rounded-md text-[15px] text-text hover:text-primary whitespace-nowrap";

  const hrefFor = (href: string) =>
    location.pathname === "/" ? href : `/${href}`;
  const handleNav = (item: (typeof NAV)[number]) => {
    setOpen(false);
    if (item.feature) notifyComingSoon(item.feature);
  };

  const renderLinks = () =>
    NAV.map((item) =>
      item.href ? (
        <a
          key={item.label}
          href={hrefFor(item.href)}
          onClick={() => setOpen(false)}
          className={linkClass}
        >
          {item.label}
        </a>
      ) : item.to ? (
        <Link
          key={item.label}
          to={item.to}
          onClick={() => setOpen(false)}
          className={linkClass}
        >
          {item.label}
        </Link>
      ) : (
        <button
          key={item.label}
          type="button"
          onClick={() => handleNav(item)}
          className={`${linkClass} text-left`}
        >
          {item.label}
        </button>
      ),
    );

  return (
    <>
      <div className="bg-[#2a0707] text-red-50/90 text-sm">
        <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={14} className="shrink-0" />
              {CONTACT.name}
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Phone size={14} />
              Hotline: {CONTACT.hotline}
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {isAuthenticated && user ? (
              <Link
                to={homePathFor(user.role)}
                className="text-red-50 hover:text-white"
              >
                Vào trang của tôi
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-red-50 hover:text-white">
                  Đăng nhập
                </Link>
                <Link
                  to="/login"
                  className="text-red-50 hover:text-white hidden sm:inline"
                >
                  Quản trị
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Brand />
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {renderLinks()}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={isAuthenticated ? "/player/booking" : "/login"}
              className="btn btn-primary px-5 py-2.5 font-semibold shadow-md"
            >
              Đặt sân ngay
            </Link>
            <button
              type="button"
              className="lg:hidden btn border border-border px-3 py-2.5"
              onClick={() => setOpen((value) => !value)}
              aria-label="Mở menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-border px-4 py-2 flex flex-col">
            {renderLinks()}
          </nav>
        )}
      </header>
    </>
  );
}

export function PublicSiteFooter() {
  return (
    <footer id="lien-he" className="bg-[#2a0707] text-red-50/85 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="mb-3">
            <Brand light />
          </div>
          <p className="text-sm">
            Hệ thống quản lý và đặt sân cho chuỗi cụm sân thể thao đa cơ sở.
          </p>
        </div>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-white mb-2">Liên hệ</p>
          <p className="flex items-center gap-2">
            <Phone size={15} />
            Hotline: {CONTACT.hotline}
          </p>
          <p className="flex items-center gap-2">
            <Mail size={15} />
            Email: {CONTACT.email}
          </p>
          <p className="flex items-center gap-2">
            <Clock size={15} />
            Mở cửa: 06:00 – 23:00 hằng ngày
          </p>
        </div>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-white mb-2">Tài khoản</p>
          <Link
            to="/register"
            className="block text-red-50/85 hover:text-white"
          >
            Đăng ký người chơi
          </Link>
          <Link to="/login" className="block text-red-50/85 hover:text-white">
            Đăng nhập
          </Link>
        </div>
      </div>
      <p className="text-center text-xs text-red-100/60 pb-6">
        © {CURRENT_YEAR} SportHub · Đồ án Nhóm 11
      </p>
    </footer>
  );
}
