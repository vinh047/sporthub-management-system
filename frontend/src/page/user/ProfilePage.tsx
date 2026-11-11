
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { UserRound, Save, Camera, Trash2 } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { avatarApi } from '../../api/avatarApi';
import { playerProfileApi } from '../../api/playerProfileApi';
import { useAuthStore } from '../../store/authStore';

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

function getAvatarSrc(url?: string | null) {
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${API_BASE_URL}/${url.replace(/^\/+/, '')}`;
}

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();

    const [fullName, setFullName] = useState(user?.fullName ?? '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await playerProfileApi.getMyProfile();
                setFullName(data.fullName ?? '');
                setPhoneNumber(data.phoneNumber ?? '');
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Không thể tải thông tin cá nhân.',
                );
            }
        };

        void loadProfile();
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleChooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn một tệp hình ảnh.');
            event.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ảnh không được vượt quá 2MB.');
            event.target.value = '';
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadAvatar = async () => {
        if (!selectedFile) {
            toast.error('Vui lòng chọn ảnh trước.');
            return;
        }

        try {
            setAvatarLoading(true);

            const response = await avatarApi.upload(selectedFile);

            if (response?.success === false) {
                toast.error(response.message || 'Upload ảnh thất bại.');
                return;
            }

            // API cần trả về data.avatarUrl, data.url hoặc data là URL.
            const data = response?.data;
            const newAvatarUrl =
                typeof data === 'string'
                    ? data
                    : data?.avatarUrl ?? data?.url;

            if (!newAvatarUrl) {
                toast.error(
                    'Upload có phản hồi nhưng chưa nhận được avatarUrl. Cần kiểm tra response của API.',
                );
                return;
            }

            setAvatarUrl(newAvatarUrl);
            updateUser({ avatarUrl: newAvatarUrl });

            setSelectedFile(null);
            setPreviewUrl('');

            toast.success('Cập nhật ảnh đại diện thành công!');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải ảnh đại diện lên.',
            );
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!avatarUrl) return;

        if (!window.confirm('Bạn có chắc muốn xóa ảnh đại diện?')) {
            return;
        }

        try {
            setAvatarLoading(true);

            const response = await avatarApi.delete();

            if (response?.success === false) {
                toast.error(response.message || 'Xóa ảnh thất bại.');
                return;
            }

            setAvatarUrl(null);
            updateUser({ avatarUrl: null });
            setSelectedFile(null);
            setPreviewUrl('');

            toast.success('Đã xóa ảnh đại diện.');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể xóa ảnh đại diện.',
            );
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!fullName.trim() || !phoneNumber.trim()) {
            toast.error('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
            return;
        }

        try {
            setLoading(true);

            const response = await authApi.updateAccount({
                fullName: fullName.trim(),
                phoneNumber: phoneNumber.trim(),
            });

            if (!response.success || !response.data) {
                toast.error(response.message || 'Cập nhật thông tin thất bại.');
                return;
            }

            updateUser({
                fullName: response.data.fullName,
                phoneNumber: response.data.phoneNumber,
            });

            setFullName(response.data.fullName);
            setPhoneNumber(response.data.phoneNumber);

            toast.success('Cập nhật thông tin cá nhân thành công!');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật thông tin.',
            );
        } finally {
            setLoading(false);
        }
    };

    const displayedAvatar = previewUrl || getAvatarSrc(avatarUrl);

    return (
        <div className= "mx-auto max-w-3xl space-y-6" >
        <div>
        <p className="text-sm font-medium text-red-600" >
            TÀI KHOẢN NGƯỜI CHƠI
                </p>
                < h1 className = "mt-1 text-2xl font-bold text-gray-900" >
                    Hồ sơ cá nhân
                        </h1>
                        < p className = "mt-2 text-sm text-gray-500" >
                            Quản lý thông tin cá nhân và thông tin liên hệ của bạn.
                </p>
                                </div>

                                < section className = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" >
                                    <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 sm:flex-row sm:items-center" >
                                        <div className="relative h-24 w-24 shrink-0" >
                                            {
                                                displayedAvatar?(
                            <img
                                src = { displayedAvatar }
                                alt = "Ảnh đại diện"
                                className = "h-24 w-24 rounded-full border border-gray-200 object-cover"
                                                        />
                        ): (
                                                        <div className = "flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <UserRound size = { 42 } />
                                            </div>
                        )
}

<label
                            htmlFor="avatarFile"
className = "absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow transition hover:bg-red-700"
title = "Chọn ảnh đại diện"
    >
    <Camera size={ 17 } />
        </label>

        < input
id = "avatarFile"
type = "file"
accept = "image/*"
onChange = { handleChooseAvatar }
className = "hidden"
    />
    </div>

    < div className = "min-w-0 flex-1" >
        <h2 className="font-bold text-gray-900" >
        { user?.fullName }
            </h2>
            < p className = "mt-1 text-sm text-gray-500" >
                Ảnh đại diện tài khoản
                    </p>
                    < p className = "mt-2 text-xs text-gray-400" >
                        Chọn ảnh JPG, PNG hoặc WEBP.Dung lượng tối đa 5MB.
                        </p>

{
    selectedFile && (
        <p className="mt-2 truncate text-sm text-green-700" >
            Đã chọn: { selectedFile.name }
    </p>
                        )
}

<div className="mt-3 flex flex-wrap gap-2" >
    <button
                                type="button"
onClick = { handleUploadAvatar }
disabled = {!selectedFile || avatarLoading}
className = "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
{ avatarLoading? 'Đang xử lý...': 'Lưu ảnh đại diện' }
    </button>

{
    avatarUrl && (
        <button
                                    type="button"
    onClick = { handleDeleteAvatar }
    disabled = { avatarLoading }
    className = "flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
        <Trash2 size={ 16 } />
                                    Xóa ảnh
        </button>
                            )
}
</div>
    </div>
    </div>

    < form onSubmit = { handleSubmit } className = "mt-6 space-y-5" >
        <div>
        <label
                            htmlFor="fullName"
className = "mb-2 block text-sm font-medium text-gray-700"
    >
    Họ và tên
        </label>
        < input
id = "fullName"
type = "text"
value = { fullName }
onChange = {(event) => setFullName(event.target.value)}
placeholder = "Nhập họ và tên"
maxLength = { 100}
className = "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
    />
    </div>

    < div >
    <label
                            htmlFor="phoneNumber"
className = "mb-2 block text-sm font-medium text-gray-700"
    >
    Số điện thoại
        </label>
        < input
id = "phoneNumber"
type = "tel"
value = { phoneNumber }
onChange = {(event) => setPhoneNumber(event.target.value)}
placeholder = "Nhập số điện thoại"
maxLength = { 15}
className = "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
    />
    </div>

    < div className = "flex justify-end border-t border-gray-100 pt-5" >
        <button
                            type="submit"
disabled = { loading }
className = "flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
    <Save size={ 17 } />
{ loading ? 'Đang lưu...' : 'Lưu thay đổi' }
</button>
    </div>
    </form>
    </section>
    </div>
    );
}
