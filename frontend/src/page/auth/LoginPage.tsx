import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';
import { saveSession } from '../../utils/session';

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

  const inputClass =
    'w-full p-3 bg-surface text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="glass p-8 rounded-lg shadow-lg max-w-md w-full animate-fade-in border border-border space-y-4"
      >
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold text-primary">SportHub</Link>
          <h1 className="text-lg font-semibold text-text mt-2">Đăng nhập</h1>
          <p className="text-sm text-muted">Dùng chung cho người chơi, nhân viên và quản trị viên</p>
        </div>

        <input
          className={inputClass}
          placeholder="Số điện thoại"
          inputMode="tel"
          autoComplete="username"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full py-3 font-semibold disabled:opacity-60"
        >
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p className="text-sm text-center text-muted">
          Chưa có tài khoản? <Link to="/register" className="font-medium">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}
