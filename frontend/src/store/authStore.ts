import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'STAFF' | 'PLAYER';

export interface User {
  userId: number;
  fullName: string;
  phoneNumber: string;
  role: Role;
  facilityId: number | null; // cơ sở được phân công (chỉ Staff)
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({ user, token, isAuthenticated: true }),

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'sporthub-auth', // key trong localStorage
    }
  )
);
