import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';
import type { CheckInChannel, CheckInHistoryItem } from './checkInApi';

export interface PosCustomer {
  userId: number;
  fullName: string;
  phoneNumber: string;
  currentTier: string;
  loyaltyPoints: number;
  reputationScore: number;
}

export interface PosBookingRequest {
  courtId: number;
  playDate: string;
  timeSlotIds: number[];
  guestName: string;
  guestPhone: string;
  paymentMethodId: number;
  customerUserId?: number | null;
}

export interface PosBookingResponse {
  bookingId: number;
  bookingCode: string;
  totalAmount: number;
}

export const posApi = {
  searchCustomers: (keyword: string) =>
    axiosInstance
      .get<ApiResponse<PosCustomer[]>>('/pos/customers', { params: { keyword } })
      .then((res) => res.data.data ?? []),

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
