import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  UsersRound,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { platformApi } from '../api';

export function PlatformOverviewPage() {
  const q = useQuery({
    queryKey: ['platform', 'overview'],
    queryFn: platformApi.overview,
    refetchInterval: 30_000,
  });

  const stats = q.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Огляд платформи</h1>
        <p className="text-sm text-base-content/60">Стан тенантів, синхронізацій та користувачів.</p>
      </div>

      {q.isLoading ? (
        <div className="skeleton h-40 w-full" />
      ) : q.isError ? (
        <div className="alert alert-error">
          <span>Помилка завантаження статистики</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              icon={<Building2 size={18} />}
              label="Всього тенантів"
              value={stats?.tenantsTotal ?? 0}
              href="/platform/tenants"
            />
            <Card
              icon={<CheckCircle size={18} className="text-emerald-500" />}
              label="Активних"
              value={stats?.tenantsActive ?? 0}
            />
            <Card
              icon={<Ban size={18} className="text-rose-500" />}
              label="Призупинених"
              value={stats?.tenantsSuspended ?? 0}
            />
            <Card
              icon={<UsersRound size={18} />}
              label="Користувачів"
              value={stats?.usersTotal ?? 0}
              href="/platform/users"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card
              icon={<Database size={18} />}
              label="Джерел даних"
              value={stats?.dataSourcesTotal ?? 0}
            />
            <Card
              icon={<CheckCircle size={18} className="text-emerald-500" />}
              label="Успішних синхронізацій (24г)"
              value={stats?.jobsLast24h.success ?? 0}
            />
            <Card
              icon={<AlertCircle size={18} className="text-rose-500" />}
              label="Помилок синхронізації (24г)"
              value={stats?.jobsLast24h.failed ?? 0}
            />
          </div>

          {(stats?.jobsLast24h.running ?? 0) > 0 && (
            <div className="alert">
              <Clock size={16} />
              <span>
                Активні синхронізації прямо зараз: <b>{stats?.jobsLast24h.running}</b>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="card bg-white shadow ring-1 ring-black/5 transition hover:ring-black/10">
      <div className="card-body p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-base-content/60">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-3xl font-semibold">{value}</div>
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
