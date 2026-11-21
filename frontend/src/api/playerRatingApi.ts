import { axiosInstance } from './axiosInstance';

export interface SkillHistory { id: number; oldRating: number; newRating: number; delta: number; changeReason: string; tournamentMatchId: number | null; createdAt: string }
export interface ReputationHistory { id: number; scoreDelta: number; reason: string; relatedBookingId: number | null; createdAt: string }
export interface PlayerRatingDashboard {
  userId: number; numericSkillRating: number; skillLevel: string;
  totalMatchesPlayed: number; reputationScore: number; totalNoShows: number;
  skillHistory: SkillHistory[]; reputationHistory: ReputationHistory[];
}
export const playerRatingApi = {
  mine: async (signal?: AbortSignal) => (await axiosInstance.get<PlayerRatingDashboard>('/player-ratings/mine', { signal })).data,
};
