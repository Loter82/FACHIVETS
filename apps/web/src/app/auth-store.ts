import { create } from 'zustand';
import type { UserDto } from '@unipro-crm/shared-types';

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  setAuth: (token: string, user: UserDto) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, user: null }),
}));
