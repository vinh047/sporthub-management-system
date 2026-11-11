
import { useState, type FormEvent } from 'react';
import { LockKeyhole, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/authApi';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            toast.error('Vui lòng nhập đầy đủ các trường.');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Mật khẩu mới cần có ít nhất 6 ký tự.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            toast.error('Mật khẩu xác nhận không khớp.');
            return;
        }

        try {
            setLoading(true);

            const response = await authApi.changePassword({
                currentPassword,
                newPassword,
                confirmNewPassword,
            });

            if (!response.success) {
                toast.error(response.message || 'Đổi mật khẩu thất bại.');
                return;
            }

            toast.success('Đổi mật khẩu thành công!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể đổi mật khẩu.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className= "mx-auto max-w-3xl space-y-6" >
        <div>
        <p className="text-sm font-medium text-red-600" > BẢO MẬT TÀI KHOẢN </p>
            < h1 className = "mt-1 text-2xl font-bold text-gray-900" >
                Đổi mật khẩu
                    </h1>
                    < p className = "mt-2 text-sm text-gray-500" >
                        Thay đổi mật khẩu để bảo vệ tài khoản của bạn.
        </p>
                            </div>

                            < section className = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" >
                                <div className="flex items-center gap-4 border-b border-gray-100 pb-5" >
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600" >
                                        <LockKeyhole size={ 27 } />
                                            </div>
                                            < div >
                                            <h2 className="font-bold text-gray-900" > Thay đổi mật khẩu </h2>
                                                < p className = "text-sm text-gray-500" >
                                                    Nhập mật khẩu hiện tại và mật khẩu mới.
            </p>
                                                        </div>
                                                        </div>

                                                        < form onSubmit = { handleSubmit } className = "mt-6 space-y-5" >
                                                            <PasswordField
            id="currentPassword"
    label = "Mật khẩu hiện tại"
    value = { currentPassword }
    onChange = { setCurrentPassword }
        />

        <PasswordField
            id="newPassword"
    label = "Mật khẩu mới"
    value = { newPassword }
    onChange = { setNewPassword }
        />

        <PasswordField
            id="confirmNewPassword"
    label = "Xác nhận mật khẩu mới"
    value = { confirmNewPassword }
    onChange = { setConfirmNewPassword }
        />

        <div className="flex justify-end border-t border-gray-100 pt-5" >
            <button
              type="submit"
    disabled = { loading }
    className = "flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
        <Save size={ 17 } />
    { loading ? 'Đang cập nhật...' : 'Đổi mật khẩu' }
    </button>
        </div>
        </form>
        </section>
        </div>
  );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
        <label
        htmlFor= { id }
    className = "mb-2 block text-sm font-medium text-gray-700"
        >
    { label }
        </label>
        < input
    id = { id }
    type = "password"
    value = { value }
    onChange = {(event) => onChange(event.target.value)
}
autoComplete = "current-password"
className = "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
    />
    </div>
  );
}
