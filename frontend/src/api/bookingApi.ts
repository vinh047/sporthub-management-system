import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

export interface CourtAvailability {
  courtId: number;
  courtName: string;
  slots: SlotAvailability[];
}

export type BookingStatus = 'Held' | 'Confirmed' | 'Cancelled' | 'Completed' | 'NoShow';

export type CourtSlotStatus =
  | 'Available'
  | 'Held'
  | 'Confirmed'
  | 'Social'
  | 'Maintenance'
  | 'Unavailable';

export interface SlotAvailability {
  timeSlotId: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isPeakHour: boolean;
  price: number;
  status: CourtSlotStatus | string;
}

export interface BookingDetail {
  id: number;
  courtId: number;
  courtName: string;
  facilityName: string;
  playDate: string;
  startTime: string;
  endTime: string;
  slotPrice: number;
}

export interface Booking {
  id: number;
  bookingCode: string;
  status: BookingStatus | string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount?: number;
  holdExpiresAt: string | null;
  details: BookingDetail[];
  paymentStatus?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
}

export interface BookingPaymentStatus {
  bookingId: number;
  bookingCode: string;
  bookingStatus: string;
  paymentStatus: string | null;
  refundStatus: string | null;
  refundAmount: number;
  refundNote: string | null;
}

export interface VnPayPaymentLink {
  bookingId: number;
  bookingCode: string;
  paymentUrl: string;
  expiresAt: string;
}

export const bookingCatalog = {
  facilities: [
    { id: 1, name: 'SportHub Quận 7' },
    { id: 2, name: 'SportHub Bình Thạnh' },
  ],
  sports: [
    { id: 1, name: 'Cầu lông' },
    { id: 2, name: 'Pickleball' },
    { id: 3, name: 'Bóng đá 5 người' },
    { id: 4, name: 'Tennis' },
  ],
} as const;

const requireData = <T>(response: ApiResponse<T>): T => {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? 'Không nhận được dữ liệu từ máy chủ.');
  }
  return response.data;
};

export const bookingApi = {
  getAvailability: async (facilityId: number, sportId: number, date: string) => {
    const response = await axiosInstance.get<ApiResponse<CourtAvailability[]>>('/court/availability', {
      params: { facilityId, sportId, date },
    });
    const courts = requireData(response.data);
    return courts.map((court) => ({
      ...court,
      slots:
        court.slots && court.slots.length > 0
          ? court.slots.map((s) => ({
              ...s,
              status: s.status ?? (s.isAvailable ? 'Available' : 'Confirmed'),
              price: s.price > 0 ? s.price : s.isPeakHour ? 120000 : 100000,
            }))
          : Array.from({ length: 17 }, (_, index) => {
              const startHour = 6 + index;
              const endHour = startHour + 1;
              const isPeakHour = startHour >= 17 && endHour <= 21;
              return {
                timeSlotId: index + 1,
                startTime: `${String(startHour).padStart(2, '0')}:00:00`,
                endTime: `${String(endHour).padStart(2, '0')}:00:00`,
                isAvailable: true,
                isPeakHour,
                price: isPeakHour ? 120000 : 100000,
                status: 'Available' as const,
              };
            }),
    }));
  },

  hold: async (courtId: number, playDate: string, timeSlotIds: number[]) => {
    const response = await axiosInstance.post<ApiResponse<Booking>>('/booking/hold', {
      courtId,
      playDate,
      timeSlotIds,
      guestName: null,
      guestPhone: null,
    });
    return requireData(response.data);
  },

  createVnPayPayment: async (bookingId: number) => {
    const response = await axiosInstance.post<ApiResponse<VnPayPaymentLink>>(`/payment/bookings/${bookingId}/vnpay`);
    return requireData(response.data);
  },

  getPaymentStatus: async (bookingId: number) => {
    const response = await axiosInstance.get<ApiResponse<BookingPaymentStatus>>(`/payment/bookings/${bookingId}/status`);
    return requireData(response.data);
  },

  getMyBookings: async () => {
    const response = await axiosInstance.get<ApiResponse<Booking[]>>('/booking/my-bookings');
    return requireData(response.data);
  },

  cancel: async (bookingId: number, reason: string) => {
    const response = await axiosInstance.post<ApiResponse<BookingPaymentStatus>>(`/booking/${bookingId}/cancel`, { reason });
    return requireData(response.data);
  },
};
