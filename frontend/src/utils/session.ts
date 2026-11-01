import type { AuthResponse } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { homePathFor } from './roleHome';

/** Lưu phiên đăng nhập và trả về trang chính theo vai trò */
export function saveSession(data: AuthResponse): string {
  useAuthStore.getState().login(
    {
      userId: data.userId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: data.role,
      facilityId: data.facilityId,
    },
    data.accessToken
  );
  return homePathFor(data.role);
}
