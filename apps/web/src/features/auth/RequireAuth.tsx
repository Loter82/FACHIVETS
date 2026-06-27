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
  const { accessToken, user, setAuth, clear } = useAuthStore();

  // Якщо є cookie refresh — http-interceptor підхопить access; пробуємо /me
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !user,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setAuth(useAuthStore.getState().accessToken ?? '', meQuery.data);
    } else if (meQuery.isError) {
      clear();
    }
  }, [meQuery.data, meQuery.isError, setAuth, clear]);

  if (meQuery.isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user && !accessToken && !meQuery.isLoading) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
