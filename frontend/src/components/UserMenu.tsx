
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    UserRound,
    Trophy,
    LockKeyhole,
    LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const ROLE_LABEL = {
    ADMIN: 'Quản trị viên',
    STAFF: 'Nhân viên',
    PLAYER: 'Người chơi',
} as const;

const initials = (name: string) =>
    name.trim()
        .split(/\s+/)
        .slice(-2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');

const getAvatarSrc = (url?: string | null) => {
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${API_BASE_URL}/${url.replace(/^\/+/, '')}`;
};

const MENU_ITEMS = [
    {
        to: '/player/profile',
        label: 'Hồ sơ cá nhân',
        icon: UserRound,
    },
    {
        to: '/player/profile/skills',
        label: 'Kỹ năng & thành tích',
        icon: Trophy,
    },
    {
        to: '/player/profile/security',
        label: 'Đổi mật khẩu',
        icon: LockKeyhole,
    },
];

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    if (!user) return null;

    const avatarSrc = getAvatarSrc(user.avatarUrl);

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className= "relative" >
        <button
                type="button"
    onClick = {() => setIsOpen((previous) => !previous)
}
className = "flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-100"
aria-expanded={ isOpen }
aria-label="Mở menu tài khoản"
    >
{
    avatarSrc?(
                    <img
                        src = { avatarSrc }
                        alt = "Avatar"
                        className = "h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
            />
                ): (
            <span className = "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white">
                        { initials(user.fullName)
}
    </span>
                )}

<span className="hidden text-left leading-tight md:block" >
    <span className="block max-w-[150px] truncate text-sm font-semibold text-gray-900" >
    { user.fullName }
        </span>
        < span className = "block text-xs text-gray-500" >
        { ROLE_LABEL[user.role]}
            </span>
            </span>

            < ChevronDown
size = { 16}
className = {`hidden text-gray-500 transition md:block ${isOpen ? 'rotate-180' : ''
    }`}
                />
    </button>

{
    isOpen && (
        <>
        <button
                        type="button"
    aria-label="Đóng menu"
    className = "fixed inset-0 z-40 cursor-default"
    onClick = {() => setIsOpen(false)
}
                    />

    < div className = "absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl" >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4" >
        {
            avatarSrc?(
                                <img
                                    src = { avatarSrc }
                                    alt = "Avatar"
                                    className = "h-11 w-11 rounded-full border border-gray-200 object-cover"
                    />
                            ): (
                    <span className = "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 font-bold text-red-600">
                                    { initials(user.fullName)
        }
            </span>
                            )}

<div className="min-w-0" >
    <p className="truncate font-semibold text-gray-900" >
    { user.fullName }
        </p>
        < p className = "mt-1 text-xs text-gray-500" >
        { user.phoneNumber }
            </p>
            </div>
            </div>

{
    user.role === 'PLAYER' && (
        <div className="p-2" >
        {
            MENU_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                                            key= { item.to }
                to = { item.to }
                end = { item.to === '/player/profile' }
                onClick = {() => setIsOpen(false)
            }
                                            className = {({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
                                            }
            >
            <Icon size={ 18 } />
    { item.label }
    </NavLink>
                                    );
})}
</div>
                        )}

<div className="border-t border-gray-100 p-2" >
    <button
                                type="button"
onClick = { handleLogout }
className = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
    >
    <LogOut size={ 18 } />
                                Đăng xuất
    </button>
    </div>
    </div>
    </>
            )}
</div>
    );
}
