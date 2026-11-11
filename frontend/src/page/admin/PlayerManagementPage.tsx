
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Search,
    RefreshCw,
    Users,
    UserX,
    UserCheck,
    Eye,
    X,
    Trophy,
    Star,
    CalendarDays,
} from 'lucide-react';

import { playerApi } from '../../api/playerApi';
import type { PlayerProfile } from '../../api/playerApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PlayerManagementPage() {
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] =
        useState<PlayerProfile | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        loadPlayers();
    }, []);

    // Tải danh sách người chơi
    const loadPlayers = async () => {
        try {
            setLoading(true);
            const data = await playerApi.getAll();
            setPlayers(data);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải danh sách người chơi.',
            );
        } finally {
            setLoading(false);
        }
    };

    // Khóa hoặc mở khóa tài khoản
    const handleToggleStatus = async (player: PlayerProfile) => {
        const nextStatus = !player.isActive;

        const confirmed = window.confirm(
            nextStatus
                ? `Bạn có chắc muốn kích hoạt tài khoản "${player.fullName}"?`
                : `Bạn có chắc muốn vô hiệu hóa tài khoản "${player.fullName}"?`,
        );

        if (!confirmed) return;

        try {
            setSavingId(player.userId);

            const updated = await playerApi.updateStatus(
                player.userId,
                { isActive: nextStatus },
            );

            setPlayers((prev) =>
                prev.map((item) =>
                    item.userId === player.userId ? updated : item,
                ),
            );

            setSelectedPlayer((prev) =>
                prev?.userId === player.userId ? updated : prev,
            );

            toast.success(
                nextStatus
                    ? 'Đã kích hoạt tài khoản người chơi.'
                    : 'Đã vô hiệu hóa tài khoản người chơi.',
            );
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật trạng thái tài khoản.',
            );
        } finally {
            setSavingId(null);
        }
    };

    // Tìm kiếm người chơi
    const filteredPlayers = players.filter((player) => {
        const keyword = searchText.toLowerCase().trim();

        return (
            player.fullName.toLowerCase().includes(keyword) ||
            player.phoneNumber.toLowerCase().includes(keyword)
        );
    });

    const activeCount = players.filter((p) => p.isActive).length;
    const inactiveCount = players.length - activeCount;

    return (
        <div className= "space-y-6" >
        {/* Tiêu đề */ }
        < div >
        <p className="text-sm font-medium text-blue-600" >
            SPORT HUB / QUẢN TRỊ
                </p>

                < h1 className = "mt-2 text-3xl font-bold text-gray-900" >
                    Quản lý người chơi
                        </h1>

                        < p className = "mt-2 text-gray-500" >
                            Theo dõi hồ sơ, thành tích và trạng thái tài khoản người chơi.
                </p>
                                </div>

    {/* Thống kê */ }
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" >
        <StatCard
                    title="Tổng người chơi"
    value = { players.length }
    icon = {< Users size = { 22} />}
                />

    < StatCard
title = "Đang hoạt động"
value = { activeCount }
icon = {< UserCheck size = { 22} />}
                />

    < StatCard
title = "Đã vô hiệu hóa"
value = { inactiveCount }
icon = {< UserX size = { 22} />}
                />
    </div>

{/* Danh sách người chơi */ }
<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" >
    <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center" >
        <h2 className="text-lg font-bold text-gray-900" >
            Danh sách người chơi
                </h2>

                < div className = "flex gap-2" >
                    <div className="relative" >
                        <Search
                                size={ 18 }
className = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
    />

    <input
                                value={ searchText }
onChange = {(event) =>
setSearchText(event.target.value)
                                }
placeholder = "Tìm tên, số điện thoại..."
className = "w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
    />
    </div>

    < button
onClick = { loadPlayers }
disabled = { loading }
title = "Tải lại dữ liệu"
className = "rounded-xl border border-gray-200 px-3 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
    <RefreshCw size={ 18 } />
        </button>
        </div>
        </div>

{
    loading ? (
        <div className= "p-12 text-center text-gray-500" >
        Đang tải danh sách người chơi...
    </div>
                ) : filteredPlayers.length === 0 ? (
        <div className= "p-12 text-center text-gray-500" >
        Không tìm thấy người chơi nào.
                    </div>
                ) : (
        <div className= "overflow-x-auto" >
        <table className="w-full min-w-[950px] text-left text-sm" >
            <thead className="bg-gray-50 text-gray-500" >
                <tr>
                <th className="px-5 py-4 font-semibold" >
                    Người chơi
                        </th>
                        < th className = "px-5 py-4 font-semibold" >
                            Trình độ
                                </th>
                                < th className = "px-5 py-4 font-semibold" >
                                    Điểm uy tín
                                        </th>
                                        < th className = "px-5 py-4 font-semibold" >
                                            Số trận
                                                </th>
                                                < th className = "px-5 py-4 font-semibold" >
                                                    Hạng
                                                    </th>
                                                    < th className = "px-5 py-4 font-semibold" >
                                                        Trạng thái
                                                            </th>
                                                            < th className = "px-5 py-4 text-right font-semibold" >
                                                                Thao tác
                                                                    </th>
                                                                    </tr>
                                                                    </thead>

                                                                    < tbody className = "divide-y divide-gray-100" >
                                                                        {
                                                                            filteredPlayers.map((player) => (
                                                                                <tr
                                        key= { player.userId }
                                        className = "hover:bg-gray-50"
                                                                                >
                                                                                <td className="px-5 py-4" >
                                                                            <div className="flex items-center gap-3" >
                                                                            {
                                                                                player.avatarUrl ? (
                                                                                    <img
                                                        src= {
                                                                                    player.avatarUrl.startsWith('http')
                                                                                        ? player.avatarUrl
                                                                                        : `${API_URL}${player.avatarUrl}`
                                                                                }
                                                        alt={ player.fullName }
                                                        className="h-10 w-10 rounded-full object-cover"
                                                                                />
                                                ) : (
                                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600" >
                                                                                    { player.fullName.charAt(0).toUpperCase() }
                                                                                </div>
                                                                                )
}

<div>
    <div className="font-semibold text-gray-900" >
    { player.fullName }
        </div>
        < div className = "mt-1 text-xs text-gray-400" >
            ID: { player.userId } · { player.phoneNumber }
</div>
    </div>
    </div>
    </td>

    < td className = "px-5 py-4 text-gray-600" >
    { player.skillLevel }
        </td>

        < td className = "px-5 py-4 font-semibold text-gray-700" >
        { player.reputationScore }
            </td>

            < td className = "px-5 py-4 text-gray-600" >
            { player.totalMatchesPlayed }
                </td>

                < td className = "px-5 py-4" >
                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700" >
                    { player.currentTier }
                        </span>
                        </td>

                        < td className = "px-5 py-4" >
                            {
                                player.isActive ? (
                                    <span className= "rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700" >
                                    Đang hoạt động
                                    </ span >
                                            ) : (
    <span className= "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600" >
    Đã vô hiệu hóa
        </span>
                                            )}
</td>

    < td className = "px-5 py-4" >
        <div className="flex justify-end gap-2" >
            <button
                                                    onClick={ () => setSelectedPlayer(player) }
title = "Xem chi tiết"
className = "rounded-lg border border-gray-200 p-2 text-blue-600 hover:bg-blue-50"
    >
    <Eye size={ 17 } />
        </button>

        < button
onClick = {() => handleToggleStatus(player)}
disabled = { savingId === player.userId}
title = {
    player.isActive
        ? 'Vô hiệu hóa'
        : 'Kích hoạt'
}
className = {`rounded-lg border p-2 disabled:opacity-50 ${player.isActive
        ? 'border-gray-200 text-red-600 hover:bg-red-50'
        : 'border-gray-200 text-green-600 hover:bg-green-50'
    }`}
                                                >
    {
        player.isActive ? (
            <UserX size= { 17} />
                                                    ) : (
                <UserCheck size={ 17} />
                                                    )}
</button>
    </div>
    </td>
    </tr>
                                ))}
</tbody>
    </table>
    </div>
                )}

<div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500" >
    Hiển thị { filteredPlayers.length } / {players.length} người chơi
        </div>
        </section>

{/* Modal chi tiết */ }
{
    selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" >
            <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" >
                <div className="mb-6 flex items-center justify-between" >
                    <h2 className="text-xl font-bold text-gray-900" >
                        Chi tiết người chơi
                            </h2>

                            < button
    onClick = {() => setSelectedPlayer(null)
}
className = "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
    >
    <X size={ 22 } />
        </button>
        </div>

        < div className = "flex flex-col items-center border-b border-gray-100 pb-5" >
            {
                selectedPlayer.avatarUrl ? (
                    <img
                                    src= {
                    selectedPlayer.avatarUrl.startsWith('http')
                        ? selectedPlayer.avatarUrl
                        : `${API_URL}${selectedPlayer.avatarUrl}`
                }
                                    alt={ selectedPlayer.fullName }
                                    className="h-20 w-20 rounded-full object-cover"
                />
                            ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600" >
                    { selectedPlayer.fullName.charAt(0).toUpperCase() }
                </div>
                )}

<h3 className="mt-3 text-lg font-bold text-gray-900" >
{ selectedPlayer.fullName }
    </h3>

    < p className = "text-sm text-gray-500" >
    { selectedPlayer.phoneNumber }
        </p>

        < span className = {`mt-3 rounded-full px-3 py-1 text-xs font-medium ${selectedPlayer.isActive
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
            {
                selectedPlayer.isActive
                    ? 'Đang hoạt động'
                    : 'Đã vô hiệu hóa'
            }
                </span>
                </div>

                < div className = "mt-5 grid grid-cols-2 gap-3" >
                    <DetailCard
                                icon={ <Star size={ 18 } /> }
label = "Điểm uy tín"
value = { selectedPlayer.reputationScore }
    />

    <DetailCard
                                icon={ <Trophy size={ 18 } /> }
label = "Trình độ"
value = { selectedPlayer.skillLevel }
    />

    <DetailCard
                                icon={ <CalendarDays size={ 18 } /> }
label = "Số trận đã chơi"
value = { selectedPlayer.totalMatchesPlayed }
    />

    <DetailCard
                                icon={ <UserX size={ 18 } /> }
label = "Số lần vắng mặt"
value = { selectedPlayer.totalNoShows }
    />

    <DetailCard
                                icon={ <Trophy size={ 18 } /> }
label = "Điểm tích lũy"
value = { selectedPlayer.loyaltyPoints }
    />

    <DetailCard
                                icon={ <Star size={ 18 } /> }
label = "Hạng thành viên"
value = { selectedPlayer.currentTier }
    />

    <DetailCard
                                icon={ <Star size={ 18 } /> }
label = "Đánh giá kỹ năng"
value = { selectedPlayer.numericSkillRating }
    />
    </div>

    < div className = "mt-6 flex justify-end gap-3" >
        <button
                                onClick={ () => setSelectedPlayer(null) }
className = "rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-600 hover:bg-gray-50"
    >
    Đóng
    </button>

    < button
onClick = {() => handleToggleStatus(selectedPlayer)}
disabled = { savingId === selectedPlayer.userId}
className = {`rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50 ${selectedPlayer.isActive
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-green-600 hover:bg-green-700'
    }`}
                            >
{
    selectedPlayer.isActive
        ? 'Vô hiệu hóa'
        : 'Kích hoạt'
}
    </button>
    </div>
    </div>
    </div>
            )}
</div>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className= "flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" >
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600" >
        { icon }
            </div>

            < div >
            <p className="text-sm text-gray-500" > { title } </p>
                < p className = "mt-1 text-2xl font-bold text-gray-900" >
                { value }
                    </p>
                    </div>
                    </div>
    );
}

function DetailCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}) {
    return (
        <div className= "rounded-xl border border-gray-100 bg-gray-50 p-3" >
        <div className="flex items-center gap-2 text-blue-600" >
        { icon }
            < span className = "text-xs font-medium text-gray-500" >
            { label }
                </span>
                </div>

                < p className = "mt-2 font-bold text-gray-900" > { value } </p>
                    </div>
    );
}
