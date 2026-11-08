import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

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
};
