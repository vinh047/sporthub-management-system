export interface Facility {
  id: number;
  name: string;
  address: string;
  hotline: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export interface CourtSummary {
  id: number;
  courtName: string;
  sportName: string;
  isActive: boolean;
}

export interface FacilityDetail extends Facility {
  courts: CourtSummary[];
}

export interface Sport {
  id: number;
  sportCode: string;
  sportName: string;
  isActive: boolean;
}

export interface SaveSportRequest {
  sportCode: string;
  sportName: string;
  isActive: boolean;
}

export interface Court {
  id: number;
  facilityId: number;
  sportId: number;
  sportName: string;
  courtName: string;
  courtType: string;
  isActive: boolean;
}

export interface SlotAvailability {
  timeSlotId: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: string;
  isPeakHour: boolean;
  price: number;
}

export interface CourtAvailability {
  courtId: number;
  courtName: string;
  slots: SlotAvailability[];
}

export interface CreateFacilityRequest {
  name: string;
  address: string;
  hotline: string;
  openTime: string;
  closeTime: string;
}

export interface UpdateFacilityRequest extends Partial<CreateFacilityRequest> {
  isActive?: boolean;
}

export interface CreateCourtRequest {
  facilityId: number;
  sportId: number;
  courtName: string;
  courtType: 'Indoor' | 'Outdoor';
}

export interface CreateCourtsRequest {
  facilityId: number;
  sportId: number;
  namePrefix: string;
  count: number;
  courtType: 'Indoor' | 'Outdoor';
}

export interface LockCourtRequest {
  courtId: number;
  maintenanceDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface UpsertPricePolicyRequest {
  facilityId: number;
  sportId: number;
  basePrice: number;
  weekendSurchargePercent: number;
  effectiveFrom: string;
  rules: { timeSlotId: number; hourlyRate: number; isPeakHour: boolean }[];
}
