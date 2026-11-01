import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, LoaderCircle, Lock, Phone, UserPlus, UserRound } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { getErrorMessage } from '../../api/errors';
import AuthShell from '../../components/AuthShell';
import FormField from '../../components/FormField';
import { useAuthStore } from '../../store/authStore';
import { homePathFor } from '../../utils/roleHome';
import { saveSession } from '../../utils/session';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && user) return <Navigate to={homePathFor(user.role)} replace />;

  const update = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
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

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Nhận ngay 100 điểm uy tín và hạng thành viên Đồng">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Họ và tên" icon={UserRound} placeholder="VD: Nguyễn Văn A" value={form.fullName} onChange={update('fullName')} required />
        <FormField label="Số điện thoại" icon={Phone} placeholder="VD: 0912345678" inputMode="tel" value={form.phoneNumber} onChange={update('phoneNumber')} required />
        <FormField label="Mật khẩu" icon={Lock} type="password" placeholder="Ít nhất 6 ký tự" autoComplete="new-password" value={form.password} onChange={update('password')} required minLength={6} />
        <FormField label="Nhập lại mật khẩu" icon={KeyRound} type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} required />

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 py-3.5 font-semibold text-white shadow-lg shadow-red-600/25 transition hover:from-red-800 hover:to-red-700 disabled:opacity-60"
        >
          {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <UserPlus size={18} />}
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-red-700 hover:text-red-800">Đăng nhập</Link>
        </p>
      </form>
    </AuthShell>
  );
}
