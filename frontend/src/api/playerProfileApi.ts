
import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

// Dữ liệu hồ sơ người chơi từ Backend
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
}

// Dữ liệu gửi lên khi cập nhật hồ sơ
export interface UpdatePlayerProfileRequest {
    skillLevel?: string | null;
}

export const playerProfileApi = {
    // Lấy hồ sơ của người đang đăng nhập
    getMyProfile: async () => {
        const response = await axiosInstance.get<ApiResponse<PlayerProfile>>(
            '/PlayerProfiles/me'
        );

        return response.data;
    },

    // Cập nhật trình độ chơi
    updateMyProfile: async (data: UpdatePlayerProfileRequest) => {
        const response = await axiosInstance.put<ApiResponse<PlayerProfile>>(
            '/PlayerProfiles/me',
            data
        );

        return response.data;
    },

    // Admin xem hồ sơ người chơi theo UserId
    getByUserId: async (userId: number) => {
        const response = await axiosInstance.get<ApiResponse<PlayerProfile>>(
            `/PlayerProfiles/${userId}`
        );

        return response.data;
    },
};
