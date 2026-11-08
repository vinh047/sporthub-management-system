import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

export interface CheckInItem {
  bookingDetailId: number;
  bookingCode: string;
  customerName: string;
  phone: string | null;
  courtName: string;
  startTime: string;   // "17:00:00"
  endTime: string;
  bookingStatus: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

export type CheckInChannel = 'Phone' | 'QRCode' | 'Manual';

export const checkInApi = {
  today: (facilityId: number) =>
    axiosInstance
      .get<ApiResponse<CheckInItem[]>>('/checkin/today', { params: { facilityId } })
      .then((res) => res.data.data ?? []),

  lookup: (keyword: string) =>
    axiosInstance
      .get<ApiResponse<CheckInItem[]>>('/checkin/lookup', { params: { keyword } })
      .then((res) => res.data.data ?? []),

  checkIn: (bookingDetailId: number, channel: CheckInChannel) =>
    axiosInstance.post<ApiResponse<null>>('/checkin', { bookingDetailId, channel }),
};
