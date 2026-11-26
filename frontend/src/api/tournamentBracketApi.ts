import { axiosInstance } from './axiosInstance';
import type { ApiResponse } from './checkHealth';
import { requestData } from './apiResponse';

export interface TournamentSet { setNumber: number; team1Points: number; team2Points: number }
export interface BracketMatch {
  id: number; roundNumber: number; matchOrder: number;
  team1Id: number | null; team1Name: string | null; team2Id: number | null; team2Name: string | null;
  winnerTeamId: number | null; status: string; scoreSummary: string | null;
  nextMatchId: number | null; nextSlot: number | null; sets: TournamentSet[];
}
export interface TournamentBracket {
  tournamentId: number; name: string; tournamentType: string; status: string; version: number;
  bestOf: number; championTeamId: number | null; championTeamName: string | null; matches: BracketMatch[];
}
export const tournamentBracketApi = {
  get: (id: number, signal?: AbortSignal) => requestData(axiosInstance.get<ApiResponse<TournamentBracket>>(`/tournaments/${id}/bracket`, { signal })),
  generate: (id: number) => requestData(axiosInstance.post<ApiResponse<TournamentBracket>>(`/tournaments/${id}/bracket`)),
  recordSet: (id: number, matchId: number, setNumber: number, team1Points: number, team2Points: number, expectedVersion: number) =>
    requestData(axiosInstance.put<ApiResponse<TournamentBracket>>(`/tournaments/${id}/bracket/matches/${matchId}/sets/${setNumber}`, { team1Points, team2Points, expectedVersion })),
};
