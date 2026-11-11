
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, UserX, RefreshCw, Users } from 'lucide-react';

import { staffApi } from '../../api/staffApi';
import type {
    StaffProfile,
    CreateStaffProfileRequest,
    UpdateStaffProfileRequest,
} from '../../api/staffApi';

import { facilityApi } from '../../api/facilityApi';
import type { Facility } from '../../api/facilityModels';

interface StaffForm {
    fullName: string;
    phoneNumber: string;
    password: string;
    position: string;
    managedFacilityId: string;
    isActive: boolean;
}

const initialForm: StaffForm = {
    fullName: '',
    phoneNumber: '',
    password: '',
    position: '',
    managedFacilityId: '',
    isActive: true,
};

export default function StaffManagementPage() {
    const [staffList, setStaffList] = useState<StaffProfile[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
    const [form, setForm] = useState<StaffForm>(initialForm);

    useEffect(() => {
        loadData();
    }, []);

    // Tải danh sách nhân viên và cơ sở
    const loadData = async () => {
        try {
            setLoading(true);

            const [staff, facilityList] = await Promise.all([
                staffApi.getAll(),
                facilityApi.getFacilities(),
            ]);

            setStaffList(staff);
            setFacilities(facilityList);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải dữ liệu.',
            );
        } finally {
            setLoading(false);
        }
    };

    // Mở form thêm mới
    const openCreateForm = () => {
        setEditingStaff(null);
        setForm(initialForm);
        setShowForm(true);
    };

    // Mở form chỉnh sửa
    const openEditForm = (staff: StaffProfile) => {
        setEditingStaff(staff);

        setForm({
            fullName: staff.fullName,
            phoneNumber: staff.phoneNumber,
            password: '',
            position: staff.position,
            managedFacilityId: staff.managedFacilityId?.toString() ?? '',
            isActive: staff.isActive,
        });

        setShowForm(true);
    };

    // Cập nhật giá trị form
    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = event.target;

        if (name === 'isActive' && event.target instanceof HTMLInputElement) {
            setForm((prev) => ({
                ...prev,
                isActive: event.target.checked,
            }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Thêm hoặc cập nhật nhân viên
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.position.trim()) {
            toast.error('Vui lòng nhập đầy đủ thông tin.');
            return;
        }

        if (!editingStaff && !form.password.trim()) {
            toast.error('Vui lòng nhập mật khẩu cho nhân viên.');
            return;
        }

        const facilityId = form.managedFacilityId
            ? Number(form.managedFacilityId)
            : null;

        try {
            setSaving(true);

            if (editingStaff) {
                const data: UpdateStaffProfileRequest = {
                    fullName: form.fullName.trim(),
                    phoneNumber: form.phoneNumber.trim(),
                    position: form.position.trim(),
                    managedFacilityId: facilityId,
                    isActive: form.isActive,
                };

                await staffApi.update(editingStaff.userId, data);
                toast.success('Cập nhật nhân viên thành công!');
            } else {
                const data: CreateStaffProfileRequest = {
                    fullName: form.fullName.trim(),
                    phoneNumber: form.phoneNumber.trim(),
                    password: form.password,
                    position: form.position.trim(),
                    managedFacilityId: facilityId,
                };

                await staffApi.create(data);
                toast.success('Thêm nhân viên thành công!');
            }

            setShowForm(false);
            setForm(initialForm);
            setEditingStaff(null);

            await loadData();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể lưu thông tin nhân viên.',
            );
        } finally {
            setSaving(false);
        }
    };

    // Vô hiệu hóa nhân viên
    const handleDeactivate = async (staff: StaffProfile) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn vô hiệu hóa nhân viên "${staff.fullName}" không?`,
        );

        if (!confirmed) return;

        try {
            await staffApi.delete(staff.userId);
            toast.success('Đã vô hiệu hóa nhân viên.');
            await loadData();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể vô hiệu hóa nhân viên.',
            );
        }
    };

    // Tìm kiếm
    const filteredStaff = staffList.filter((staff) => {
        const keyword = searchText.toLowerCase().trim();

        return (
            staff.fullName.toLowerCase().includes(keyword) ||
            staff.phoneNumber.toLowerCase().includes(keyword) ||
            staff.position.toLowerCase().includes(keyword)
        );
    });

    const activeCount = staffList.filter((staff) => staff.isActive).length;
    const inactiveCount = staffList.length - activeCount;

    return (
        <div className= "space-y-6" >
        {/* Tiêu đề */ }
        < div className = "flex flex-col justify-between gap-4 sm:flex-row sm:items-center" >
            <div>
            <p className="text-sm font-medium text-blue-600" >
                SPORT HUB / QUẢN TRỊ
                    </p>

                    < h1 className = "mt-2 text-3xl font-bold text-gray-900" >
                        Quản lý nhân viên
                            </h1>

                            < p className = "mt-2 text-gray-500" >
                                Quản lý tài khoản và thông tin nhân viên hệ thống.
          </p>
                                    </div>

                                    < button
    onClick = { openCreateForm }
    className = "flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
        <Plus size={ 19 } />
          Thêm nhân viên
        </button>
        </div>

    {/* Thống kê */ }
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" >
        <StatCard
          title="Tổng nhân viên"
    value = { staffList.length }
    icon = {< Users size = { 22} />}
        />

    < StatCard
title = "Đang hoạt động"
value = { activeCount }
icon = {< Users size = { 22} />}
        />

    < StatCard
title = "Đã vô hiệu hóa"
value = { inactiveCount }
icon = {< UserX size = { 22} />}
        />
    </div>

{/* Danh sách */ }
<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" >
    <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center" >
        <h2 className="text-lg font-bold text-gray-900" >
            Danh sách nhân viên
                </h2>

                < div className = "flex gap-2" >
                    <div className="relative" >
                        <Search
                size={ 18 }
className = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
    />

    <input
                value={ searchText }
onChange = {(event) => setSearchText(event.target.value)}
placeholder = "Tìm tên, số điện thoại..."
className = "w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
    />
    </div>

    < button
onClick = { loadData }
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
        Đang tải danh sách nhân viên...
    </div>
        ) : filteredStaff.length === 0 ? (
        <div className= "p-12 text-center text-gray-500" >
        Không tìm thấy nhân viên nào.
          </div>
        ) : (
        <div className= "overflow-x-auto" >
        <table className="w-full min-w-[850px] text-left text-sm" >
            <thead className="bg-gray-50 text-gray-500" >
                <tr>
                <th className="px-5 py-4 font-semibold" > Nhân viên </th>
                    < th className = "px-5 py-4 font-semibold" > Số điện thoại </th>
                        < th className = "px-5 py-4 font-semibold" > Chức vụ </th>
                            < th className = "px-5 py-4 font-semibold" > Cơ sở </th>
                                < th className = "px-5 py-4 font-semibold" > Trạng thái </th>
                                    < th className = "px-5 py-4 text-right font-semibold" > Thao tác </th>
                                        </tr>
                                        </thead>

                                        < tbody className = "divide-y divide-gray-100" >
                                            {
                                                filteredStaff.map((staff) => (
                                                    <tr key= { staff.userId } className = "hover:bg-gray-50" >
                                                    <td className="px-5 py-4" >
                                                <div className="font-semibold text-gray-900" >
                                                { staff.fullName }
                                                </div>
                                                < div className = "mt-1 text-xs text-gray-400" >
                                                ID: { staff.userId }
                                                </div>
                                                </td>

                                                < td className = "px-5 py-4 text-gray-600" >
                                                { staff.phoneNumber }
                                                </td>

                                                < td className = "px-5 py-4 text-gray-600" >
                                                { staff.position }
                                                </td>

                                                < td className = "px-5 py-4 text-gray-600" >
                                                { staff.facilityName || 'Chưa phân công' }
                                                </td>

                                                < td className = "px-5 py-4" >
                                                {
                                                    staff.isActive ? (
                                                        <span className= "rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700" >
                                                        Đang hoạt động
                                                        </ span >
                      ) : (
                                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600" >
                                                        Đã vô hiệu hóa
                                                        </span>
                                                        )
}
</td>

    < td className = "px-5 py-4" >
        <div className="flex justify-end gap-2" >
            <button
                          onClick={ () => openEditForm(staff) }
title = "Chỉnh sửa"
className = "rounded-lg border border-gray-200 p-2 text-blue-600 hover:bg-blue-50"
    >
    <Pencil size={ 17 } />
        </button>

{
    staff.isActive && (
        <button
                            onClick={ () => handleDeactivate(staff) }
    title = "Vô hiệu hóa"
    className = "rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50"
        >
        <UserX size={ 17 } />
            </button>
                        )
}
</div>
    </td>
    </tr>
                ))}
</tbody>
    </table>
    </div>
        )}

<div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500" >
    Hiển thị { filteredStaff.length } / {staffList.length} nhân viên
        </div>
        </section>

{/* Form thêm / sửa */ }
{
    showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" >
            <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl" >
                <div className="mb-6 flex items-center justify-between" >
                    <h2 className="text-xl font-bold text-gray-900" >
                    { editingStaff? 'Cập nhật nhân viên': 'Thêm nhân viên mới' }
                        </h2>

                        < button
    onClick = {() => setShowForm(false)
}
className = "text-2xl text-gray-400 hover:text-gray-700"
    >
                ×
</button>
    </div>

    < form onSubmit = { handleSubmit } className = "space-y-4" >
        <FormInput
                label="Họ và tên"
name = "fullName"
value = { form.fullName }
onChange = { handleChange }
placeholder = "Nhập họ và tên"
    />

    <FormInput
                label="Số điện thoại"
name = "phoneNumber"
value = { form.phoneNumber }
onChange = { handleChange }
placeholder = "Nhập số điện thoại"
    />

    {!editingStaff && (
        <FormInput
                  label="Mật khẩu"
name = "password"
type = "password"
value = { form.password }
onChange = { handleChange }
placeholder = "Nhập mật khẩu ban đầu"
    />
              )}

<FormInput
                label="Chức vụ"
name = "position"
value = { form.position }
onChange = { handleChange }
placeholder = "Ví dụ: Lễ tân, Quản lý..."
    />

    <div>
    <label className="mb-2 block text-sm font-medium text-gray-700" >
        Cơ sở quản lý
            </label>

            < select
name = "managedFacilityId"
value = { form.managedFacilityId }
onChange = { handleChange }
className = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
    >
    <option value="" > Chưa phân công cơ sở </option>

{
    facilities.map((facility) => (
        <option key= { facility.id } value = { facility.id } >
        { facility.name }
        </option>
    ))
}
</select>
    </div>

{
    editingStaff && (
        <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-3" >
            <input
                    type="checkbox"
    name = "isActive"
    checked = { form.isActive }
    onChange = { handleChange }
    className = "h-4 w-4 accent-blue-600"
        />
        <span className="text-sm font-medium text-gray-700" >
            Tài khoản đang hoạt động
                </span>
                </label>
              )
}

<div className="flex justify-end gap-3 pt-4" >
    <button
                  type="button"
onClick = {() => setShowForm(false)}
disabled = { saving }
className = "rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-600 hover:bg-gray-50"
    >
    Hủy
    </button>

    < button
type = "submit"
disabled = { saving }
className = "rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
{
    saving
    ? 'Đang lưu...'
        : editingStaff
            ? 'Lưu thay đổi'
            : 'Tạo nhân viên'
}
    </button>
    </div>
    </form>
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
                < p className = "mt-1 text-2xl font-bold text-gray-900" > { value } </p>
                    </div>
                    </div>
  );
}

function FormInput({
    label,
    name,
    value,
    onChange,
    placeholder,
    type = 'text',
}: {
    label: string;
    name: string;
    value: string;
    onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
    placeholder: string;
    type?: string;
}) {
    return (
        <div>
        <label
        htmlFor= { name }
    className = "mb-2 block text-sm font-medium text-gray-700"
        >
    { label }
        </label>

        < input
    id = { name }
    name = { name }
    type = { type }
    value = { value }
    onChange = { onChange }
    placeholder = { placeholder }
    required
    className = "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
        />
        </div>
  );
}
