import { axiosInstance } from './axiosInstance';

interface RegisterRequest {
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    axiosInstance.post('/auth/register', data),

  login: (data: LoginRequest) =>
    axiosInstance.post('/auth/login', data),

  updateSportProfile: (sports: { sportId: number; skillLevel: string }[]) =>
    axiosInstance.put('/auth/sport-profile', { sports }),
};
