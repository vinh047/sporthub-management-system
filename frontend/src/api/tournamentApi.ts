import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';

export interface TournamentAthleteDto {
  id: number;
  userId: number;
  fullName: string;
  phoneNumber: string;
  isCaptain: boolean;
  skillRating: number | null;
  skillLevel: string | null;
}

export interface TournamentTeamDto {
  id: number;
  tournamentId: number;
  teamName: string;
  seedNumber: number | null;
  status: string;
  registrationDate: string;
  athletes: TournamentAthleteDto[];
}

export interface TournamentMatchDto {
  id: number;
  roundNumber: number;
  matchOrder: number;
  courtId: number | null;
  courtName: string | null;
  scheduledStartTime: string | null;
  team1Id: number | null;
  team1Name: string | null;
  team2Id: number | null;
  team2Name: string | null;
  winnerTeamId: number | null;
  scoreSummary: string | null;
  status: string;
}

export interface TournamentDto {
  id: number;
  facilityId: number;
  facilityName: string;
  sportId: number;
  sportName: string;
  name: string;
  tournamentType: 'SingleElimination' | 'RoundRobin' | string;
  registrationDeadline: string;
  startDate: string;
  endDate: string;
  maxTeams: number;
  registeredTeamsCount: number;
  entryFee: number;
  prizeDescription: string | null;
  status: 'Draft' | 'OpenReg' | 'DrawCompleted' | 'InProgress' | 'Finished' | string;
  createdAt: string;
}

export interface TournamentDetailDto extends TournamentDto {
  facilityAddress: string;
  teams: TournamentTeamDto[];
  matches: TournamentMatchDto[];
}

export interface CreateTournamentRequest {
  facilityId: number;
  sportId: number;
  name: string;
  tournamentType: string;
  registrationDeadline: string;
  startDate: string;
  endDate: string;
  maxTeams: number;
  entryFee: number;
  prizeDescription?: string;
  status?: string;
}

export interface RegisterTournamentTeamRequest {
  teamName: string;
  memberPhones?: string[];
  memberUserIds?: number[];
  memberNames?: string[];
}

export interface TournamentPaymentLink {
  teamId: number;
  tournamentId: number;
  teamName: string;
  amount: number;
  referenceCode: string;
  paymentUrl: string;
  expiresAt: string;
}

export interface TournamentFeePayment {
  transactionId: number;
  tournamentId: number;
  tournamentName: string;
  teamId: number;
  teamName: string;
  teamStatus: string;
  amount: number;
  paymentMethodCode: string;
  paymentStatus: string;
  referenceCode: string | null;
  paymentUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

export const tournamentApi = {
  getMine: (signal?: AbortSignal) =>
    axiosInstance
      .get<ApiResponse<TournamentDetailDto[]>>('/tournaments/mine', { signal })
      .then((res) => res.data.data ?? []),

  createVnPayPayment: (tournamentId: number, teamId: number) =>
    axiosInstance
      .post<ApiResponse<TournamentPaymentLink>>(`/payment/tournaments/${tournamentId}/teams/${teamId}/vnpay`)
      .then((res) => res.data.data!),

  getPaymentStatus: (tournamentId: number, teamId: number, signal?: AbortSignal) =>
    axiosInstance
      .get<ApiResponse<TournamentFeePayment | null>>(`/payment/tournaments/${tournamentId}/teams/${teamId}/status`, { signal })
      .then((res) => res.data.data ?? null),

  getAll: (params?: { facilityId?: number; sportId?: number; status?: string }) =>
    axiosInstance
      .get<ApiResponse<TournamentDto[]>>('/tournaments', { params })
      .then((res) => res.data.data ?? []),

  getById: (id: number) =>
    axiosInstance
      .get<ApiResponse<TournamentDetailDto>>(`/tournaments/${id}`)
      .then((res) => res.data.data!),

  create: (body: CreateTournamentRequest) =>
    axiosInstance
      .post<ApiResponse<TournamentDto>>('/tournaments', body)
      .then((res) => res.data),

  updateStatus: (id: number, status: string) =>
    axiosInstance
      .put<ApiResponse<TournamentDto>>(`/tournaments/${id}/status`, { status })
      .then((res) => res.data),

  registerTeam: (tournamentId: number, body: RegisterTournamentTeamRequest) =>
    axiosInstance
      .post<ApiResponse<TournamentTeamDto>>(`/tournaments/${tournamentId}/teams`, body)
      .then((res) => res.data),
};
