import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto } from '@unipro-crm/shared-types';

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  hydrated: boolean;
  setAuth: (token: string, user: UserDto) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

/**
 * Persist accessToken + user у localStorage, щоб перезавантаження сторінки
 * не викидало на /login. Refresh-cookie (httpOnly) все одно домінує:
 * якщо access протухне — interceptor підтягне новий.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hydrated: false,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'uniboost-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
      onRehydrateStorage: () => () => {
        // Позначаємо гідрацію завершеною — щоб RequireAuth не редіректив передчасно.
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
