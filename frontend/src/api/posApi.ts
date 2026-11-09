import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';
import type { CheckInChannel, CheckInHistoryItem } from './checkInApi';

export interface PosBookingRequest {
  courtId: number;
  playDate: string;        // "2026-11-01"
  timeSlotIds: number[];
  guestName: string;
  guestPhone: string;
  paymentMethodId: number; // 1 = Tiền mặt, 2 = Chuyển khoản
}

export interface PosBookingResponse {
  bookingId: number;
  bookingCode: string;
  totalAmount: number;
}

export const posApi = {
  createBooking: (body: PosBookingRequest) =>
    axiosInstance
      .post<ApiResponse<PosBookingResponse>>('/pos/bookings', body)
      .then((res) => res.data),

  checkIn: (bookingDetailId: number, channel: CheckInChannel) =>
    axiosInstance
      .post<ApiResponse<null>>('/pos/check-ins', { bookingDetailId, channel })
      .then((res) => res.data),

  getCheckInHistory: (facilityId: number, date?: string) =>
    axiosInstance
      .get<ApiResponse<CheckInHistoryItem[]>>('/pos/check-ins', {
        params: { facilityId, ...(date ? { date } : {}) },
      })
      .then((res) => res.data.data ?? []),
};
