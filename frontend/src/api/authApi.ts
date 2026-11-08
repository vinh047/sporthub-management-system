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

export interface AuthResponse {
  userId: number;
  fullName: string;
  phoneNumber: string;
  role: Role;
  facilityId: number | null;
  accessToken: string;
  expiresAt: string;
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
}

export const authApi = {
  register: (data: RegisterRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data).then((res) => res.data),

  login: (data: LoginRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', data).then((res) => res.data),

  me: () => axiosInstance.get<ApiResponse<MeResponse>>('/auth/me').then((res) => res.data),

  updateSportProfile: (sports: { sportId: number; skillLevel: string }[]) =>
    axiosInstance.put('/auth/sport-profile', { sports }),
};
