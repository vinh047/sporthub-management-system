
import { axiosInstance } from './axiosInstance';
import { requestAction, requestData } from './apiResponse';

export interface StaffProfile {
    userId: number;
    fullName: string;
    phoneNumber: string;
    position: string;
    managedFacilityId: number | null;
    facilityName: string | null;
    isActive: boolean;
}

export interface CreateStaffProfileRequest {
    fullName: string;
    phoneNumber: string;
    password: string;
    position: string;
    managedFacilityId: number | null;
}

export interface UpdateStaffProfileRequest {
    fullName: string;
    phoneNumber: string;
    position: string;
    managedFacilityId: number | null;
    isActive: boolean;
}

export const staffApi = {
    // Lấy danh sách nhân viên
    getAll: () =>
        requestData<StaffProfile[]>(
            axiosInstance.get('/StaffProfiles')
        ),

    // Lấy thông tin một nhân viên
    getByUserId: (userId: number) =>
        requestData<StaffProfile>(
            axiosInstance.get(`/StaffProfiles/${userId}`)
        ),

    // Tạo tài khoản nhân viên
    create: (data: CreateStaffProfileRequest) =>
        requestData<StaffProfile>(
            axiosInstance.post('/StaffProfiles', data)
        ),

    // Cập nhật hồ sơ nhân viên
    update: (userId: number, data: UpdateStaffProfileRequest) =>
        requestData<StaffProfile>(
            axiosInstance.put(`/StaffProfiles/${userId}`, data)
        ),

    // Vô hiệu hóa nhân viên
    delete: (userId: number) =>
        requestAction(
            axiosInstance.delete(`/StaffProfiles/${userId}`)
        ),
};
