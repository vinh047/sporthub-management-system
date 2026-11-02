import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoaderCircle, Lock, LogIn, Phone } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import AuthShell from '../../components/AuthShell';
import FormField from '../../components/FormField';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';
import { saveSession } from '../../utils/session';

// Tài khoản mẫu do DataSeeder tạo (chỉ hiện khi chạy dev)
const DEMO_ACCOUNTS = [
  { role: 'Quản trị', phone: '0900000000', password: 'Admin@123' },
  { role: 'Nhân viên', phone: '0900000001', password: 'Staff@123' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Đã đăng nhập thì vào thẳng trang của mình
  if (isAuthenticated && user) return <Navigate to={homePathFor(user.role)} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.login({ phoneNumber: phoneNumber.trim(), password });
      if (!res.data) throw new Error('Không nhận được dữ liệu đăng nhập.');
      toast.success(`Xin chào ${res.data.fullName}!`);
      navigate(saveSession(res.data), { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Chào mừng trở lại" subtitle="Đăng nhập để đặt sân và quản lý tài khoản của bạn">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          label="Số điện thoại"
          icon={Phone}
          placeholder="VD: 0912345678"
          inputMode="tel"
          autoComplete="username"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <FormField
          label="Mật khẩu"
          icon={Lock}
          type="password"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 py-3.5 font-semibold text-white shadow-lg shadow-red-600/25 transition hover:from-red-800 hover:to-red-700 disabled:opacity-60"
        >
          {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-red-700 hover:text-red-800">Đăng ký ngay</Link>
        </p>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-xl border border-dashed border-red-200 bg-red-50/60 p-4 text-sm">
          <p className="mb-2 font-semibold text-red-800">Tài khoản mẫu (chỉ hiện khi chạy dev)</p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.phone}
                type="button"
                onClick={() => { setPhoneNumber(a.phone); setPassword(a.password); }}
                className="flex w-full justify-between rounded-lg px-2 py-1 text-left text-gray-700 hover:bg-red-100/70"
              >
                <span>{a.role}</span>
                <span className="font-mono text-gray-500">{a.phone} / {a.password}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
