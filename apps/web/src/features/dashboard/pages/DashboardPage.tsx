import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  Receipt,
  FileText,
} from 'lucide-react';
import type { DashboardKpiDto, DashboardPeriod } from '@unipro-crm/shared-types';
import { dashboardApi } from '../api';
import { fmt } from '@/shared/lib/format';
import { useAuthStore } from '@/app/auth-store';

const PERIODS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Сьогодні' },
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Рік' },
  { value: 'all', label: 'Весь час' },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<DashboardPeriod>('month');

  const q = useQuery({
    queryKey: ['dashboard-overview', period],
    queryFn: () => dashboardApi.overview(period),
    refetchOnWindowFocus: false,
  });

  const kpi = q.data?.kpi;
  const timeline = q.data?.timeline;
  const topCustomers = q.data?.topCustomers ?? [];
  const topProducts = q.data?.topProducts ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-content">
            Вітаємо, {user?.fullName ?? 'користувачу'}
          </h1>
          <p className="mt-0.5 text-sm text-base-content/50">
            Аналітика продажів
          </p>
        </div>
        {/* Period tabs */}
        <div className="flex rounded-xl bg-base-200 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                period === p.value
                  ? 'bg-white text-base-content shadow-sm'
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<CreditCard size={18} strokeWidth={1.5} className="text-primary" />}
          label="Виторг"
          value={fmt.money(kpi?.revenue ?? 0)}
          delta={kpi ? fmt.delta(kpi.revenue, kpi.revenuePrev) : null}
          loading={q.isLoading}
        />
        <KpiCard
          icon={<ShoppingCart size={18} strokeWidth={1.5} className="text-violet-500" />}
          label="Продажів"
          value={fmt.num(kpi?.ordersCount ?? 0)}
          delta={kpi ? fmt.delta(kpi.ordersCount, kpi.ordersCountPrev) : null}
          loading={q.isLoading}
        />
        <KpiCard
          icon={<Package size={18} strokeWidth={1.5} className="text-emerald-500" />}
          label="Середній чек"
          value={fmt.money(kpi?.avgCheck ?? 0)}
          delta={kpi ? fmt.delta(kpi.avgCheck, kpi.avgCheckPrev) : null}
          loading={q.isLoading}
        />
        <KpiCard
          icon={<Users size={18} strokeWidth={1.5} className="text-amber-500" />}
          label="Клієнтів"
          value={fmt.num(kpi?.uniqueCustomers ?? 0)}
          delta={kpi ? fmt.delta(kpi.uniqueCustomers, kpi.uniqueCustomersPrev) : null}
          loading={q.isLoading}
        />
      </div>

      {/* Sales breakdown: Roздріб (Чек) vs Опт (Видаткова) */}
      <SalesBreakdown kpi={kpi} loading={q.isLoading} />

      {/* Chart + Top customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-elevated overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-sm font-semibold">Динаміка виторгу</h2>
            <span className="text-xs text-base-content/40">
              {timeline ? bucketLabel(timeline.bucket) : ''}
            </span>
          </div>
          {q.isLoading ? (
            <div className="flex h-52 items-center justify-center">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : timeline && timeline.points.length > 0 ? (
            <RevenueChart points={timeline.points} bucket={timeline.bucket} />
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-base-content/40">
              Немає даних за обраний період
            </div>
          )}
        </div>

        <div className="card-elevated px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Топ клієнти</h2>
            <Link to="/customers" className="text-xs text-primary hover:underline">
              Всі →
            </Link>
          </div>
          {q.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : topCustomers.length === 0 ? (
            <div className="py-8 text-center text-sm text-base-content/40">Немає даних</div>
          ) : (
            <ul className="space-y-1">
              {topCustomers.map((c, i) => (
                <li
                  key={c.partnerId}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-base-200"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base-200 text-[10px] font-semibold text-base-content/60">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{c.displayName}</div>
                    <div className="text-[10px] text-base-content/40">
                      {fmt.num(c.ordersCount)} прод.
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-semibold tabular-nums">
                    {fmt.money(c.revenue)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="card-elevated overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-sm font-semibold">Топ товари</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="border-b border-base-200 text-xs text-base-content/50">
                <th className="w-8 bg-transparent">#</th>
                <th className="bg-transparent">Товар</th>
                <th className="bg-transparent font-mono">Код</th>
                <th className="bg-transparent text-right">Кількість</th>
                <th className="bg-transparent text-right">Виторг</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <span className="loading loading-spinner text-primary" />
                  </td>
                </tr>
              )}
              {!q.isLoading &&
                topProducts.map((p, i) => (
                  <tr key={p.goodId} className="border-b border-base-100 hover:bg-base-100/60">
                    <td className="text-xs text-base-content/40">{i + 1}</td>
                    <td className="text-sm font-medium">{p.name ?? `Товар #${p.goodId}`}</td>
                    <td className="font-mono text-xs text-base-content/50">{p.code ?? '—'}</td>
                    <td className="text-right tabular-nums text-xs">{fmt.num(p.qtty, 2)}</td>
                    <td className="text-right tabular-nums text-sm font-semibold">
                      {fmt.money(p.revenue)}
                    </td>
                  </tr>
                ))}
              {!q.isLoading && topProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-base-content/40">
                    Немає даних
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: { value: number; positive: boolean } | null;
  loading: boolean;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-base-content/50">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-base-200">
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-28 rounded-lg" />
      ) : (
        <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      )}
      {delta && !loading && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
            delta.positive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {delta.positive ? (
            <TrendingUp size={12} strokeWidth={2} />
          ) : (
            <TrendingDown size={12} strokeWidth={2} />
          )}
          {Math.abs(delta.value).toFixed(1)}% vs попередній
        </div>
      )}
    </div>
  );
}

function bucketLabel(b: 'day' | 'week' | 'month'): string {
  return b === 'day' ? 'по днях' : b === 'week' ? 'по тижнях' : 'по місяцях';
}

function SalesBreakdown({
  kpi,
  loading,
}: {
  kpi: DashboardKpiDto | undefined;
  loading: boolean;
}) {
  const retailRev = kpi?.retailRevenue ?? 0;
  const wholesaleRev = kpi?.wholesaleRevenue ?? 0;
  const totalRev = retailRev + wholesaleRev;
  const retailPct = totalRev > 0 ? (retailRev / totalRev) * 100 : 0;
  const wholesalePct = totalRev > 0 ? (wholesaleRev / totalRev) * 100 : 0;

  return (
    <div className="card-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Структура продажів</h2>
        <span className="text-xs text-base-content/40">
          за обраний період
        </span>
      </div>

      {/* Stacked bar */}
      {loading ? (
        <div className="skeleton h-2 w-full rounded-full" />
      ) : totalRev > 0 ? (
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-base-200">
          <div
            className="bg-violet-500"
            style={{ width: `${retailPct}%` }}
            title={`Роздріб: ${retailPct.toFixed(1)}%`}
          />
          <div
            className="bg-sky-500"
            style={{ width: `${wholesalePct}%` }}
            title={`Опт: ${wholesalePct.toFixed(1)}%`}
          />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-base-200" />
      )}

      {/* Two channels */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChannelRow
          icon={<Receipt size={16} strokeWidth={1.5} className="text-violet-500" />}
          dotClass="bg-violet-500"
          label="Роздріб"
          sublabel="Чек (РРО)"
          orders={kpi?.retailOrders ?? 0}
          revenue={retailRev}
          pct={retailPct}
          loading={loading}
        />
        <ChannelRow
          icon={<FileText size={16} strokeWidth={1.5} className="text-sky-500" />}
          dotClass="bg-sky-500"
          label="Опт"
          sublabel="Видаткова накладна"
          orders={kpi?.wholesaleOrders ?? 0}
          revenue={wholesaleRev}
          pct={wholesalePct}
          loading={loading}
        />
      </div>
    </div>
  );
}

function ChannelRow({
  icon,
  dotClass,
  label,
  sublabel,
  orders,
  revenue,
  pct,
  loading,
}: {
  icon: React.ReactNode;
  dotClass: string;
  label: string;
  sublabel: string;
  orders: number;
  revenue: number;
  pct: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-base-100/60 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[10px] text-base-content/40">· {sublabel}</span>
        </div>
        {loading ? (
          <div className="mt-1 skeleton h-4 w-32 rounded" />
        ) : (
          <div className="mt-0.5 text-[11px] text-base-content/50 tabular-nums">
            {fmt.num(orders)} продажів · {pct.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        {loading ? (
          <div className="skeleton h-5 w-20 rounded" />
        ) : (
          <div className="text-sm font-bold tabular-nums">{fmt.money(revenue)}</div>
        )}
      </div>
    </div>
  );
}

function RevenueChart({
  points,
  bucket,
}: {
  points: Array<{ date: string; revenue: number; ordersCount: number }>;
  bucket: 'day' | 'week' | 'month';
}) {
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const width = 800;
  const height = 220;
  const pad = { top: 12, right: 16, bottom: 28, left: 16 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  const pts = points.map((p, i) => ({
    x: pad.left + i * step,
    y: pad.top + innerH - (p.revenue / max) * innerH,
    ...p,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${pad.top + innerH} L ${pts[0].x} ${pad.top + innerH} Z`
    : '';

  const labelFormat = (iso: string) => {
    const d = new Date(iso);
    if (bucket === 'month') return `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}.${d.getUTCFullYear().toString().slice(2)}`;
    return `${d.getUTCDate().toString().padStart(2, '0')}.${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  };

  const labelEvery = Math.max(1, Math.ceil(pts.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          {i % labelEvery === 0 && (
            <text x={p.x} y={height - 6} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.4}>
              {labelFormat(p.date)}
            </text>
          )}
          <circle cx={p.x} cy={p.y} r={0} fill="#3b82f6">
            <title>{labelFormat(p.date)} · {fmt.money(p.revenue)} · {p.ordersCount} прод.</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
