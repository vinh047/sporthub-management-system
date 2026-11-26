import { axiosInstance } from './axiosInstance';
export interface SocialAttendee { id: number; userId: number; fullName: string; status: string; paidAmount: number; canCheckIn: boolean }
export interface SocialAttendance { sessionId: number; title: string; opensAtUtc: string; closesAtUtc: string; participants: SocialAttendee[] }
const root = (id: number) => `/social-sessions/${id}/attendance`;
export const socialAttendanceApi = {
  list: async (id: number, signal?: AbortSignal) => (await axiosInstance.get<SocialAttendance>(root(id), { signal })).data,
  checkIn: async (id: number, ticketId: number) => (await axiosInstance.post<SocialAttendee>(`${root(id)}/${ticketId}/check-in`)).data,
};
