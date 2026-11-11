
import { useEffect, useState, type FormEvent } from 'react';
import { Award, Medal, ShieldCheck, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    playerProfileApi,
    type PlayerProfile,
} from '../../api/playerProfileApi';

const SKILL_LEVELS = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Pro', label: 'Pro' },
];

const TIER_INFO: Record<
    string,
    { label: string; min: number; next: number | null }
> = {
    Bronze: { label: 'Đồng', min: 0, next: 500 },
    Silver: { label: 'Bạc', min: 500, next: 1500 },
    Gold: { label: 'Vàng', min: 1500, next: 3000 },
    Platinum: { label: 'Kim cương', min: 3000, next: null },
};

export default function PlayerSkillsPage() {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [skillLevel, setSkillLevel] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // requestData đã lấy phần data bên trong ApiResponse.
                const data = await playerProfileApi.getMyProfile();

                setProfile(data);
                setSkillLevel(data.skillLevel ?? 'Beginner');
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Không thể tải thông tin kỹ năng.',
                );
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, []);

    const handleUpdateSkill = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!skillLevel) {
            toast.error('Vui lòng chọn trình độ của bạn.');
            return;
        }

        try {
            setSaving(true);

            const updatedProfile = await playerProfileApi.updateMyProfile({
                skillLevel,
            });

            setProfile(updatedProfile);
            setSkillLevel(updatedProfile.skillLevel);

            toast.success('Cập nhật trình độ thành công!');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật trình độ.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className= "py-16 text-center text-gray-500" >
            Đang tải thông tin kỹ năng...
        </div>
    );
    }

    if (!profile) {
        return (
            <div className= "rounded-2xl border border-gray-200 bg-white p-8 text-center" >
            <p className="text-gray-600" > Không tải được thông tin người chơi.</p>
                < button
        type = "button"
        onClick = {() => window.location.reload()
    }
    className = "mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
        Thử tải lại
            </button>
            </div>
    );
}

const tier = TIER_INFO[profile.currentTier ?? 'Bronze'] ?? TIER_INFO.Bronze;

const points = Number(profile.loyaltyPoints ?? 0);
const reputationScore = Number(profile.reputationScore ?? 0);
const totalMatchesPlayed = Number(profile.totalMatchesPlayed ?? 0);
const totalNoShows = Number(profile.totalNoShows ?? 0);
const progress = tier.next
    ? Math.min(
        100,
        Math.max(0, ((points - tier.min) / (tier.next - tier.min)) * 100),
    )
    : 100;

return (
    <div className= "space-y-6" >
    <div>
    <p className="text-sm font-medium text-red-600" > TÀI KHOẢN NGƯỜI CHƠI </p>
        < h1 className = "mt-1 text-2xl font-bold text-gray-900" >
            Kỹ năng & thành tích
                </h1>
                < p className = "mt-2 text-sm text-gray-500" >
                    Theo dõi trình độ, thành tích thi đấu và điểm thành viên của bạn.
        </p>
                        </div>

{/* Các chỉ số thành tích */ }
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" >
    <StatCard
  icon={ <ShieldCheck size={ 21 } /> }
label = "Điểm uy tín"
value = { reputationScore }
description = "Điểm đánh giá hiện tại"
    />
    <StatCard
  icon={ <Trophy size={ 21 } /> }
label = "Trận đã chơi"
value = { totalMatchesPlayed }
description = "Tổng số trận tham gia"
    />
    <StatCard
  icon={ <Users size={ 21 } /> }
label = "Lần vắng mặt"
value = { totalNoShows }
description = "Số lần không tham gia"
    />
    <StatCard
  icon={ <Award size={ 21 } /> }
label = "Điểm thành viên"
value = { points }
description = "Điểm tích lũy hiện có"
    />
    </div>

{/* Trình độ kỹ năng */ }
<section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" >
    <div className="flex items-center gap-3" >
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600" >
            <Medal size={ 22 } />
                </div>
                < div >
                <h2 className="font-bold text-gray-900" > Trình độ thể thao </h2>
                    < p className = "text-sm text-gray-500" >
                        Cập nhật trình độ hiện tại của bạn.
            </p>
                            </div>
                            </div>

                            < form onSubmit = { handleUpdateSkill } className = "mt-5" >
                                <label
            htmlFor="skillLevel"
className = "mb-2 block text-sm font-medium text-gray-700"
    >
    Trình độ của bạn
        </label>

        < div className = "flex flex-col gap-3 sm:flex-row" >
            <select
              id="skillLevel"
value = { skillLevel }
onChange = {(event) => setSkillLevel(event.target.value)}
className = "min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
    >
{
    SKILL_LEVELS.map((level) => (
        <option key= { level.value } value = { level.value } >
        { level.label }
        </option>
    ))
}
    </select>

    < button
type = "submit"
disabled = { saving || skillLevel === profile.skillLevel}
className = "rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
{ saving? 'Đang lưu...': 'Lưu thay đổi' }
    </button>
    </div>
    </form>
    </section>

{/* Hạng thành viên */ }
<section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" >
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center" >
        <div>
        <p className="text-sm text-gray-500" > HẠNG THÀNH VIÊN HIỆN TẠI </p>
            < h2 className = "mt-1 text-2xl font-bold text-gray-900" >
            { tier.label }
                </h2>
                < p className = "mt-1 text-sm text-gray-500" >
                { points.toLocaleString('vi-VN') } điểm tích lũy
                    </p>
                    </div>

                    < div className = "flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600" >
                        <Award size={ 34 } />
                            </div>
                            </div>

                            < div className = "mt-6" >
                                {
                                    tier.next !== null ? (
                                        <>
                                        <div className= "mb-2 flex justify-between gap-3 text-sm" >
                                        <span className="text-gray-500"> Tiến độ lên hạng tiếp theo</ span >
                                <span className="font-semibold text-gray-900" >
                                    { Math.round(progress) } %
                                    </span>
                                    </div>

                                    < div className = "h-3 overflow-hidden rounded-full bg-gray-100" >
                                        <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
style = {{ width: `${progress}%` }}
                />
    </div>

    < p className = "mt-3 text-sm text-gray-500" >
        Bạn cần thêm{ ' ' }
<strong className="text-gray-900" >
{ Math.max(0, tier.next - points).toLocaleString('vi-VN') }
    </strong>{' '}
                điểm để đạt hạng tiếp theo.
              </p>
    </>
          ) : (
    <p className= "rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800" >
    Chúc mừng! Bạn đã đạt hạng thành viên cao nhất.
            </p>
          )}
</div>
    </section>
    </div>
  );
}

function StatCard({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    description: string;
}) {
    return (
        <div className= "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" >
        <div className="flex items-center justify-between" >
            <p className="text-sm font-medium text-gray-500" > { label } </p>
                < span className = "rounded-xl bg-red-50 p-2 text-red-600" > { icon } </span>
                    </div>
                    < p className = "mt-3 text-2xl font-bold text-gray-900" >
                    { value.toLocaleString('vi-VN') }
                        </p>
                        < p className = "mt-1 text-xs text-gray-500" > { description } </p>
                            </div>
  );
}
