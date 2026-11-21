import { axiosInstance } from './axiosInstance';
import axios from 'axios';

export interface SocialInput {
  facilityId: number;
  sportId: number;
  title: string;
  playDate: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  feePerSlot: number;
  minSkill: number;
  maxSkill: number;
  description: string | null;
  courtIds: number[];
}
export interface SocialSession extends SocialInput {
  id: number;
  registeredCount: number;
  heldCount?: number;
  availableSlots: number;
  status: string;
}
export interface SocialFilters {
  sportId?: number;
  facilityId?: number;
  date?: string;
  minSkill?: number;
  maxSkill?: number;
}
const root = '/social-sessions';
export const socialApi = {
  list: async (params: SocialFilters = {}, signal?: AbortSignal) =>
    (await axiosInstance.get<SocialSession[]>(root, { params, signal })).data,
  detail: async (id: number, signal?: AbortSignal) =>
    (await axiosInstance.get<SocialSession>(`${root}/${id}`, { signal })).data,
  manage: async (signal?: AbortSignal) =>
    (await axiosInstance.get<SocialSession[]>(`${root}/manage`, { signal })).data,
  create: async (input: SocialInput) =>
    (await axiosInstance.post<SocialSession>(root, input)).data,
  update: async (id: number, input: SocialInput) =>
    (await axiosInstance.put<SocialSession>(`${root}/${id}`, input)).data,
  cancel: async (id: number) => { await axiosInstance.delete(`${root}/${id}`); },
};
export function socialError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string; detail?: string; errors?: string[] | Record<string, string[]> } | undefined;
    const errors = body?.errors;
    if (Array.isArray(errors) && errors.length) return errors.join(' ');
    if (errors && !Array.isArray(errors)) return Object.values(errors).flat().join(' ');
    if (body?.message || body?.detail) return body.message || body.detail || '';
    switch (error.response?.status) {
      case 400: return 'Dữ liệu không hợp lệ.';
      case 401: return 'Vui lòng đăng nhập lại.';
      case 403: return 'Bạn không có quyền thực hiện thao tác này.';
      case 404: return 'Không tìm thấy buổi chơi hoặc dữ liệu liên quan.';
      case 409: return 'Xung đột lịch sân hoặc trạng thái buổi chơi. Vui lòng kiểm tra lại.';
    }
    return error.response ? 'Máy chủ chưa xử lý được yêu cầu.' : 'Không kết nối được máy chủ.';
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra.';
}
