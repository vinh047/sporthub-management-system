import { axiosInstance } from './axiosInstance';
import { requestAction, requestData } from './apiResponse';
import type { ApiResponse } from './checkHealth';
import type { Court, CourtAvailability, Facility, FacilityDetail, SlotAvailability, Sport } from './facilityModels';
import type {
  CreateCourtRequest, CreateCourtsRequest, CreateFacilityRequest, LockCourtRequest,
  SaveSportRequest, UpdateFacilityRequest, UpsertPricePolicyRequest,
} from './facilityModels';

const buildFallbackSlots = (): SlotAvailability[] =>
  Array.from({ length: 17 }, (_, index) => {
    const startHour = 6 + index;
    const endHour = startHour + 1;
    const isPeakHour = startHour >= 17 && endHour <= 21;
    return {
      timeSlotId: index + 1,
      startTime: `${String(startHour).padStart(2, '0')}:00:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00:00`,
      isAvailable: true,
      status: 'Available',
      isPeakHour,
      price: isPeakHour ? 120000 : 100000,
    };
  });

const ensureCourtSlots = (courts: CourtAvailability[]): CourtAvailability[] =>
  courts.map((court) => ({
    ...court,
    slots:
      court.slots && court.slots.length > 0
        ? court.slots.map((s) => ({
            ...s,
            status: s.status ?? (s.isAvailable ? 'Available' : 'Confirmed'),
            price: s.price > 0 ? s.price : s.isPeakHour ? 120000 : 100000,
          }))
        : buildFallbackSlots(),
  }));

export const facilityApi = {
  getFacilities: () => requestData(axiosInstance.get<ApiResponse<Facility[]>>('/facility')),
  getFacility: (id: number) =>
    requestData(axiosInstance.get<ApiResponse<FacilityDetail>>(`/facility/${id}`)),
  createFacility: (body: CreateFacilityRequest) =>
    requestData(axiosInstance.post<ApiResponse<Facility>>('/facility', body)),
  updateFacility: (id: number, body: UpdateFacilityRequest) =>
    requestData(axiosInstance.put<ApiResponse<Facility>>(`/facility/${id}`, body)),
  getSports: () =>
    requestData(axiosInstance.get<ApiResponse<Sport[]>>('/sports')),
  getManagedSports: () =>
    requestData(axiosInstance.get<ApiResponse<Sport[]>>('/sports/manage')),
  createSport: (body: SaveSportRequest) =>
    requestData(axiosInstance.post<ApiResponse<Sport>>('/sports', body)),
  updateSport: (id: number, body: SaveSportRequest) =>
    requestData(axiosInstance.put<ApiResponse<Sport>>(`/sports/${id}`, body)),
  deleteSport: (id: number) =>
    requestAction(axiosInstance.delete<ApiResponse<unknown>>(`/sports/${id}`)),
  createCourt: (body: CreateCourtRequest) =>
    requestData(axiosInstance.post<ApiResponse<Court>>('/court', body)),
  createCourts: (body: CreateCourtsRequest) =>
    requestData(axiosInstance.post<ApiResponse<Court[]>>('/court/batch', body)),
  getAvailability: (facilityId: number, sportId: number, date: string) =>
    requestData(axiosInstance.get<ApiResponse<CourtAvailability[]>>('/court/availability', {
      params: { facilityId, sportId, date },
    })).then(ensureCourtSlots),
  lockCourt: (body: LockCourtRequest) =>
    requestAction(axiosInstance.post<ApiResponse<unknown>>('/court/maintenance', body)),
  upsertPricePolicy: (body: UpsertPricePolicyRequest) =>
    requestAction(axiosInstance.post<ApiResponse<unknown>>('/pricing/policies', body)),
};
