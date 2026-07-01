import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/auth-store';

/**
 * Захист платформ-адмінки: пускає лише PLATFORM_ADMIN.
 * Інших авторизованих кидає на /, неавторизованих — на /login.
 */
export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'PLATFORM_ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}
