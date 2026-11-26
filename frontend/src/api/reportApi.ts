import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

export interface DailyRevenue {
  date: string;
  revenue: number;
  bookingCount: number;
  peakHourRevenue: number;
  offPeakRevenue: number;
  occupiedSlots: number;
}

export interface FacilityRevenueBreakdown {
  facilityId: number;
  facilityName: string;
  bookingRevenue: number;
  tournamentRevenue: number;
  socialRevenue: number;
  totalRevenue: number;
  peakHourRevenue: number;
  offPeakRevenue: number;
  totalBookings: number;
  bookedSlotsCount: number;
}

export interface SportRevenueBreakdown {
  sportId: number;
  sportName: string;
  bookingRevenue: number;
  tournamentRevenue: number;
  socialRevenue: number;
  totalRevenue: number;
  peakHourRevenue: number;
  offPeakRevenue: number;
  totalBookings: number;
  bookedSlotsCount: number;
}

export interface TimeSlotRevenueBreakdown {
  timeSlotId: number;
  startTime: string;
  endTime: string;
  isPeakHour: boolean;
  revenue: number;
  bookedCount: number;
}

export interface RevenueReportResponse {
  facilityId: number;
  facilityName: string;
  from: string;
  to: string;
  totalRevenue: number;
  totalBookings: number;
  dailyBreakdown: DailyRevenue[];
  sportId: number | null;
  sportName: string | null;
  bookingRevenue: number;
  tournamentRevenue: number;
  socialRevenue: number;
  peakHourRevenue: number;
  offPeakRevenue: number;
  totalBookedSlots: number;
  peakBookedSlots: number;
  facilityBreakdown: FacilityRevenueBreakdown[];
  sportBreakdown: SportRevenueBreakdown[];
  peakHourBreakdown: TimeSlotRevenueBreakdown[];
}

export interface CourtOccupancy {
  courtId: number;
  courtName: string;
  totalSlots: number;
  occupiedSlots: number;
  facilityId: number;
  facilityName: string;
  sportId: number;
  sportName: string;
  occupancyRate: number;
  peakTotalSlots: number;
  peakOccupiedSlots: number;
  peakOccupancyRate: number;
}

export interface FacilityOccupancyBreakdown {
  facilityId: number;
  facilityName: string;
  activeCourtsCount: number;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  peakTotalSlots: number;
  peakOccupiedSlots: number;
  peakOccupancyRate: number;
}

export interface SportOccupancyBreakdown {
  sportId: number;
  sportName: string;
  activeCourtsCount: number;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  peakTotalSlots: number;
  peakOccupiedSlots: number;
  peakOccupancyRate: number;
}

export interface TimeSlotOccupancyBreakdown {
  timeSlotId: number;
  startTime: string;
  endTime: string;
  isPeakHour: boolean;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
}

export interface OccupancyReportResponse {
  facilityId: number;
  date: string;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  courtBreakdown: CourtOccupancy[];
  facilityName: string;
  from: string | null;
  to: string | null;
  sportId: number | null;
  sportName: string | null;
  peakTotalSlots: number;
  peakOccupiedSlots: number;
  peakOccupancyRate: number;
  offPeakTotalSlots: number;
  offPeakOccupiedSlots: number;
  offPeakOccupancyRate: number;
  facilityBreakdown: FacilityOccupancyBreakdown[];
  sportBreakdown: SportOccupancyBreakdown[];
  hourlyBreakdown: TimeSlotOccupancyBreakdown[];
}

export interface DashboardAnalyticsResponse {
  revenue: RevenueReportResponse;
  occupancy: OccupancyReportResponse;
}

export interface ReportFilterParams {
  facilityId?: number;
  sportId?: number;
  from?: string;
  to?: string;
  date?: string;
  onlyPeakHours?: boolean;
}

export const reportApi = {
  getRevenue: (params?: ReportFilterParams) =>
    axiosInstance
      .get<ApiResponse<RevenueReportResponse>>('/reports/revenue', { params })
      .then((res) => res.data.data!),

  getOccupancy: (params?: ReportFilterParams) =>
    axiosInstance
      .get<ApiResponse<OccupancyReportResponse>>('/reports/occupancy', { params })
      .then((res) => res.data.data!),

  getAnalytics: (params?: ReportFilterParams) =>
    axiosInstance
      .get<ApiResponse<DashboardAnalyticsResponse>>('/reports/analytics', { params })
      .then((res) => res.data.data!),
};
