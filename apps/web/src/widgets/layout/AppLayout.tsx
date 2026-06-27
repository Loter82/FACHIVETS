import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  PieChart,
  Megaphone,
  Zap,
  BarChart3,
  CheckSquare,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/app/auth-store';

const NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/customers', label: 'Клієнти', icon: Users },
  { to: '/segments', label: 'Сегменти', icon: PieChart },
  { to: '/campaigns', label: 'Кампанії', icon: Megaphone },
  { to: '/automation', label: 'Автоматизація', icon: Zap },
  { to: '/analytics', label: 'Аналітика', icon: BarChart3 },
  { to: '/tasks', label: 'Задачі', icon: CheckSquare },
  { to: '/sync', label: 'Синхронізація', icon: RefreshCw },
  { to: '/settings', label: 'Налаштування', icon: Settings },
];

export function AppLayout() {
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
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-neutral lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-bold text-white">Ф</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Фахівець CRM</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Будматеріали
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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

        {/* User */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {((user?.fullName ?? 'U')[0] ?? 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">
                {user?.fullName ?? 'Користувач'}
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

      {/* Mobile drawer */}
      <div className="drawer lg:hidden">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content" />
        <div className="drawer-side z-40">
          <label htmlFor="app-drawer" className="drawer-overlay" />
          <aside className="flex h-full w-60 flex-col bg-neutral">
            <div className="flex items-center gap-3 px-5 py-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                <span className="text-sm font-bold text-white">Ф</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Фахівець CRM</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Будматеріали
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-2">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      const cb = document.getElementById('app-drawer') as HTMLInputElement | null;
                      if (cb) cb.checked = false;
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
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
            {/* Mobile user / logout */}
            <div className="border-t border-white/10 px-3 py-3">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {((user?.fullName ?? 'U')[0] ?? 'U').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white">
                    {user?.fullName ?? 'Користувач'}
                  </div>
                  <div className="truncate text-[10px] text-white/40">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    const cb = document.getElementById('app-drawer') as HTMLInputElement | null;
                    if (cb) cb.checked = false;
                    logoutM.mutate();
                  }}
                  className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/80"
                  title="Вийти"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Top bar — mobile only */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-base-300 bg-white px-4 py-3 lg:hidden">
          <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square">
            <Menu size={18} />
          </label>
          <span className="text-sm font-semibold">Фахівець CRM</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="dropdown dropdown-end">
              <button tabIndex={0} className="btn btn-ghost btn-sm gap-1 text-xs">
                <span className="max-w-[120px] truncate">{user?.fullName ?? 'Користувач'}</span>
                <ChevronDown size={12} />
              </button>
              <ul className="menu dropdown-content z-30 mt-2 w-48 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
                <li className="px-2 py-1 text-xs text-base-content/50">{user?.email}</li>
                <li>
                  <button className="gap-2 text-sm" onClick={() => logoutM.mutate()}>
                    <LogOut size={14} />
                    Вийти
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
