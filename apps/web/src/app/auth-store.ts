import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto } from '@unipro-crm/shared-types';

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  setAuth: (token: string, user: UserDto) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

/**
 * Persist accessToken + user у localStorage, щоб F5 не викидав на /login.
 * Refresh-cookie (httpOnly) домінує: коли access протухне — interceptor підтягне новий.
 * Стан hydration читаємо через `useAuthStore.persist.hasHydrated()` у консумерах.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'uniboost-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
    },
  ),
);
