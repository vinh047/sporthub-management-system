import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — tự động đính kèm JWT token (trừ login/register)
axiosInstance.interceptors.request.use((config) => {
  const isAuthRequest = /\/auth\/(login|register)$/.test(config.url ?? '');
  const token = useAuthStore.getState().token;
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — xử lý 401 (token hết hạn)
// Bỏ qua API đăng nhập/đăng ký: 401 ở đó là sai mật khẩu, để trang tự hiện lỗi
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = /\/auth\/(login|register)$/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && !isAuthRequest) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/vouchers') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
