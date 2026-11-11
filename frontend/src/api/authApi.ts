import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';
import type { Role } from '../store/authStore';

export interface RegisterRequest {
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface UpdateAccountRequest {
    fullName: string;
    phoneNumber: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

export interface AuthResponse {
  userId: number;
  fullName: string;
  phoneNumber: string;
  role: Role;
  facilityId: number | null;
  accessToken: string;
  expiresAt: string;
  avatarUrl: string | null;
}

export interface PlayerSummary {
  reputationScore: number;
  skillRating: number;
  skillLevel: string;
  loyaltyPoints: number;
  tier: string;
  totalMatchesPlayed: number;
}

export interface MeResponse {
  userId: number;
  fullName: string;
  phoneNumber: string;
  role: Role;
  facilityId: number | null;
  player: PlayerSummary | null;
  avatarUrl: string | null;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data).then((res) => res.data),

  login: (data: LoginRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', data).then((res) => res.data),

  me: () => axiosInstance.get<ApiResponse<MeResponse>>('/auth/me').then((res) => res.data),

  updateSportProfile: (sports: { sportId: number; skillLevel: string }[]) =>
    axiosInstance.put('/auth/sport-profile', { sports }),

  updateAccount: (data: UpdateAccountRequest) =>
      axiosInstance
          .put<ApiResponse<MeResponse>>('/auth/me', data)
          .then((res) => res.data),

  changePassword: (data: ChangePasswordRequest) =>
      axiosInstance
          .put<ApiResponse<unknown>>('/auth/change-password', data)
          .then((res) => res.data),
};
