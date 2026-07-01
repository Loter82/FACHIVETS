import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from '@/app/auth-store';

interface Props {
  children: React.ReactNode;
}

export function RequireAuth({ children }: Props) {
  const location = useLocation();
  const { accessToken, user, hydrated, setAuth, clear } = useAuthStore();

  // Виконуємо /me лише коли гідрація зі localStorage завершилась і немає user.
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

  // Ще не гідрувались або запит /me триває — показуємо спінер, не редіректимо.
  const stillLoading = !hydrated || (meQuery.isFetching && !user);
  if (stillLoading) {
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
