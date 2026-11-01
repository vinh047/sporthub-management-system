import { axiosInstance } from './axiosInstance';

export interface HealthCheckEntry {
  name: string;
  status: string;
  description: string | null;
  durationMs: number;
}

export interface HealthCheckResponse {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  totalDurationMs: number;
  checkedAt: string;
  checks: HealthCheckEntry[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
}

export const CheckHealth = {
  // GET /api/health: 200 = ổn, 503 = có thành phần lỗi (vẫn trả data) nên không coi 503 là lỗi request
  check: () =>
    axiosInstance
      .get<ApiResponse<HealthCheckResponse>>('/health', {
        validateStatus: (status) => status === 200 || status === 503,
      })
      .then((res) => res.data),
};
