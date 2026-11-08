import { axiosInstance } from './axiosInstance';
import { requestData } from './apiResponse';
import type { ApiResponse } from './checkHealth';

export interface Promotion {
  id: number;
  promoCode: string;
  title: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  startDate: string;
  endDate: string;
  isOffPeakOnly: boolean;
  isActive: boolean;
}

export interface PromotionDiscount {
  promoCode: string;
  discountAmount: number;
  finalAmount: number;
}

export interface UserVoucher {
  id: number;
  promotionId: number;
  promoCode: string;
  title: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
}

export interface CreatePromotionRequest {
  promoCode: string;
  title: string;
  discountType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  startDate: string;
  endDate: string;
  isOffPeakOnly: boolean;
}

export const promotionApi = {
  getActive: () => requestData(axiosInstance.get<ApiResponse<Promotion[]>>('/promotion/active')),
  create: (body: CreatePromotionRequest) =>
    requestData(axiosInstance.post<ApiResponse<Promotion>>('/promotion', body)),
  validate: (body: { promoCode: string; orderAmount: number; isOffPeak: boolean }) =>
    requestData(axiosInstance.post<ApiResponse<PromotionDiscount>>('/promotion/validate', body)),
  getWallet: () => requestData(axiosInstance.get<ApiResponse<UserVoucher[]>>('/promotion/wallet')),
  claim: (promotionId: number) =>
    requestData(axiosInstance.post<ApiResponse<UserVoucher>>(`/promotion/${promotionId}/claim`)),
  redeem: (body: { userVoucherId: number; bookingId: number }) =>
    requestData(axiosInstance.post<ApiResponse<PromotionDiscount>>('/promotion/redeem', body)),
};
