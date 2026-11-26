import { axiosInstance } from './axiosInstance';
export interface SocialTicket {
  id: number; sessionId: number; sessionTitle: string; status: string;
  paidAmount: number; fee: number; registeredAt: string;
  holdExpiresAtUtc: string | null; paymentTransactionId: number | null; paymentStatus: string | null;
}
export interface SocialPaymentMethod { id: number; methodCode: string; methodName: string }
export interface CancellationQuote { canCancel: boolean; refundAmount: number | null; message: string }
const root = '/social-tickets';
export const socialTicketApi = {
  mine: async (signal?: AbortSignal) => (await axiosInstance.get<SocialTicket[]>(`${root}/mine`, { signal })).data,
  methods: async (signal?: AbortSignal) => (await axiosInstance.get<SocialPaymentMethod[]>(`${root}/payment-methods`, { signal })).data,
  reserve: async (id: number, paymentMethodId: number | null) => (await axiosInstance.post<SocialTicket>(`${root}/reserve/${id}`, {paymentMethodId})).data,
  quote: async (id: number) => (await axiosInstance.get<CancellationQuote>(`${root}/${id}/cancellation-quote`)).data,
  cancel: async (id: number) => (await axiosInstance.post<SocialTicket>(`${root}/${id}/cancel`)).data,
};
export const ticketStatus = (status: string) => ({PendingPayment:'Chờ thanh toán', Confirmed:'Đã xác nhận', Cancelled:'Đã hủy', Expired:'Hết hạn giữ chỗ', CheckedIn:'Đã check-in', NoShow:'Vắng mặt'}[status] ?? status);
export const utcMillis = (value: string) => Date.parse(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value + 'Z');
