import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';
import { saveSession } from '../../utils/session';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && user) return <Navigate to={homePathFor(user.role)} replace />;

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.register({ ...form, phoneNumber: form.phoneNumber.trim() });
      if (!res.data) throw new Error('Không nhận được dữ liệu đăng ký.');
      toast.success('Đăng ký thành công!');
      navigate(saveSession(res.data), { replace: true });   // API trả token nên đăng nhập luôn
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
          <h1 className="text-lg font-semibold text-text mt-2">Tạo tài khoản người chơi</h1>
        </div>

        <input className={inputClass} placeholder="Họ và tên" value={form.fullName} onChange={update('fullName')} required />
        <input className={inputClass} placeholder="Số điện thoại" inputMode="tel" value={form.phoneNumber} onChange={update('phoneNumber')} required />
        <input className={inputClass} type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autoComplete="new-password" value={form.password} onChange={update('password')} required minLength={6} />
        <input className={inputClass} type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} required />

        <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 font-semibold disabled:opacity-60">
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>

        <p className="text-sm text-center text-muted">
          Đã có tài khoản? <Link to="/login" className="font-medium">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
