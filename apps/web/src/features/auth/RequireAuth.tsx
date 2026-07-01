import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from '@/app/auth-store';

interface Props {
  children: React.ReactNode;
}

export function RequireAuth({ children }: Props) {
  const location = useLocation();
  const { accessToken, user, setAuth, clear } = useAuthStore();

  // Чекаємо, поки zustand-persist прочитає localStorage.
  // Для sync-storage це моментально, але тримаємо гейт на випадок SSR/асинхронного storage.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: hydrated && !user,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setAuth(useAuthStore.getState().accessToken ?? '', meQuery.data);
    } else if (meQuery.isError) {
      clear();
    }
  }, [meQuery.data, meQuery.isError, setAuth, clear]);

  if (!hydrated || (meQuery.isFetching && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user && !accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
