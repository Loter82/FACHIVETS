import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Package,
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
  X,
  type LucideIcon,
} from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/app/auth-store';

const NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/customers', label: 'Клієнти', icon: Users },
  { to: '/stock', label: 'Залишки товарів', icon: Package },
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
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // PLATFORM_ADMIN не має справи з CRM-виглядом — редіректимо у /platform.
  useEffect(() => {
    if (user?.role === 'PLATFORM_ADMIN') {
      navigate('/platform', { replace: true });
    }
  }, [user, navigate]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  const logoutM = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clear();
      navigate('/login', { replace: true });
    },
  });

  const SidebarBody = (
    <>
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
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
    </>
  );

  return (
    <div className="flex h-full bg-base-100">
      {/* Desktop sidebar (in-flow on lg+) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-neutral lg:flex">
        {SidebarBody}
      </aside>

      {/* Mobile off-canvas drawer (fixed, only on mobile) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Panel */}
        <aside
          className={`absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col bg-neutral shadow-2xl transition-transform duration-200 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Закрити меню"
          >
            <X size={16} />
          </button>
          {SidebarBody}
        </aside>
      </div>

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar — mobile only */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-base-300 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Відкрити меню"
          >
            <Menu size={18} />
          </button>
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

