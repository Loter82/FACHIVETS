import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  UsersRound,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/app/auth-store';

const NAV = [
  { to: '/platform', label: 'Огляд', icon: BarChart3, end: true },
  { to: '/platform/tenants', label: 'Тенанти', icon: Building2, end: false },
  { to: '/platform/users', label: 'Користувачі', icon: UsersRound, end: false },
];

export function PlatformLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logoutM = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className="flex h-full bg-base-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Платформа</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Адмін-панель
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-100 ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/90'
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
              {((user?.fullName ?? 'A')[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">
                {user?.fullName ?? 'Адмін'}
              </div>
              <div className="truncate text-[10px] text-white/40">{user?.email}</div>
            </div>
            <button
              onClick={() => logoutM.mutate()}
              className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/80"
              title="Вийти"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-base-300 bg-white px-4 py-3 lg:hidden">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold">Платформа</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => logoutM.mutate()}>
              <LogOut size={14} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
