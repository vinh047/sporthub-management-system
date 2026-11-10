import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

export interface CheckInItem {
  bookingDetailId: number;
  bookingId: number;
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

export interface CheckInHistoryItem {
  checkInLogId: number;
  bookingDetailId: number;
  bookingId: number;
  bookingCode: string;
  customerName: string;
  phone: string | null;
  courtName: string;
  playDate: string;
  startTime: string;
  endTime: string;
  channel: string;
  checkInAt: string;
  staffName: string;
  bookingStatus?: string;
}

export interface ReceptionBookingSlot {
  bookingDetailId: number;
  courtId: number;
  courtName: string;
  sportName: string;
  playDate: string;
  startTime: string;
  endTime: string;
  slotPrice: number;
  checkedIn: boolean;
  checkInLogId: number | null;
  checkInAt: string | null;
  checkInChannel: string | null;
  checkedInByStaffName: string | null;
}

export interface ReceptionPayment {
  transactionId: number;
  methodName: string;
  transactionType: string;
  amount: number;
  status: string;
  referenceCode: string | null;
  createdAt: string;
  processedAt: string | null;
  verifiedByStaffName: string | null;
}

export interface ReceptionPlayerProfile {
  userId: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  reputationScore: number;
  skillLevel: string;
  numericSkillRating: number;
  totalMatchesPlayed: number;
  totalNoShows: number;
  loyaltyPoints: number;
  currentTier: string;
}

export interface ReceptionBookingDetail {
  bookingId: number;
  bookingCode: string;
  bookingStatus: 'Held' | 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow' | string;
  createdAt: string;
  updatedAt: string | null;
  holdExpiresAt: string | null;
  facilityId: number;
  facilityName: string;
  customerType: 'Member' | 'Guest' | string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  createdByStaffName: string | null;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalSlots: number;
  checkedInSlots: number;
  playerProfile: ReceptionPlayerProfile | null;
  slots: ReceptionBookingSlot[];
  payments: ReceptionPayment[];
  cancelReason: string | null;
  cancelledAt: string | null;
  refundAmount: number | null;
  loyaltyPointsEarned: number;
  reputationDeltaApplied: number;
}

export type CheckInChannel = 'Phone' | 'QRCode' | 'Manual';

export const checkInApi = {
  today: (facilityId: number) =>
    axiosInstance
      .get<ApiResponse<CheckInItem[]>>('/checkin/today', { params: { facilityId } })
      .then((res) => res.data.data ?? []),

  history: (facilityId: number, date?: string) =>
    axiosInstance
      .get<ApiResponse<CheckInHistoryItem[]>>('/checkin/history', {
        params: { facilityId, ...(date ? { date } : {}) },
      })
      .then((res) => res.data.data ?? []),

  lookup: (keyword: string) =>
    axiosInstance
      .get<ApiResponse<CheckInItem[]>>('/checkin/lookup', { params: { keyword } })
      .then((res) => res.data.data ?? []),

  checkIn: (bookingDetailId: number, channel: CheckInChannel) =>
    axiosInstance.post<ApiResponse<null>>('/checkin', { bookingDetailId, channel }),

  getBookingOrder: (bookingId: number) =>
    axiosInstance
      .get<ApiResponse<ReceptionBookingDetail>>(`/checkin/bookings/${bookingId}`)
      .then((res) => res.data.data!),

  checkInAllSlots: (bookingId: number, channel: CheckInChannel = 'Manual') =>
    axiosInstance
      .post<ApiResponse<ReceptionBookingDetail>>(`/checkin/bookings/${bookingId}/check-in-all`, {
        channel,
      })
      .then((res) => res.data.data!),

  undoSlotCheckIn: (bookingDetailId: number) =>
    axiosInstance
      .delete<ApiResponse<ReceptionBookingDetail>>(`/checkin/details/${bookingDetailId}`)
      .then((res) => res.data.data!),

  collectPayment: (
    bookingId: number,
    payload: { paymentMethodId: number; amount?: number; referenceCode?: string },
  ) =>
    axiosInstance
      .post<ApiResponse<ReceptionBookingDetail>>(
        `/checkin/bookings/${bookingId}/collect-payment`,
        payload,
      )
      .then((res) => res.data.data!),

  checkoutBooking: (
    bookingId: number,
    payload: { paymentMethodId?: number; note?: string } = {},
  ) =>
    axiosInstance
      .post<ApiResponse<ReceptionBookingDetail>>(
        `/checkin/bookings/${bookingId}/checkout`,
        payload,
      )
      .then((res) => res.data.data!),

  markNoShow: (bookingId: number, note?: string) =>
    axiosInstance
      .post<ApiResponse<ReceptionBookingDetail>>(`/checkin/bookings/${bookingId}/no-show`, {
        note,
      })
      .then((res) => res.data.data!),

  cancelAtCounter: (bookingId: number, reason: string) =>
    axiosInstance
      .post<ApiResponse<ReceptionBookingDetail>>(`/checkin/bookings/${bookingId}/cancel`, {
        reason,
      })
      .then((res) => res.data.data!),

  updateCustomerInfo: (bookingId: number, payload: { guestName: string; guestPhone: string }) =>
    axiosInstance
      .put<ApiResponse<ReceptionBookingDetail>>(`/checkin/bookings/${bookingId}/customer`, payload)
      .then((res) => res.data.data!),
};
