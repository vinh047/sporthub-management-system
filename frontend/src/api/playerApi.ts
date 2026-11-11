
import { axiosInstance } from './axiosInstance';
import { requestData } from './apiResponse';

export interface PlayerProfile {
    userId: number;
    fullName: string;
    phoneNumber: string;
    reputationScore: number;
    numericSkillRating: number;
    skillLevel: string;
    totalMatchesPlayed: number;
    totalNoShows: number;
    loyaltyPoints: number;
    currentTier: string;
    avatarUrl: string | null;
    isActive: boolean;
}

export interface UpdatePlayerStatusRequest {
    isActive: boolean;
}

export const playerApi = {
    // Lấy danh sách người chơi
    getAll: () =>
        requestData<PlayerProfile[]>(
            axiosInstance.get('/PlayerProfiles')
        ),

    // Xem chi tiết người chơi
    getByUserId: (userId: number) =>
        requestData<PlayerProfile>(
            axiosInstance.get(`/PlayerProfiles/${userId}`)
        ),

    // Khóa hoặc mở khóa tài khoản
    updateStatus: (userId: number, data: UpdatePlayerStatusRequest) =>
        requestData<PlayerProfile>(
            axiosInstance.put(`/PlayerProfiles/${userId}/status`, data)
        ),
};
