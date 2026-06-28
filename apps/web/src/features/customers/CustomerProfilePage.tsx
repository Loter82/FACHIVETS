import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, Store, Receipt, ChevronLeft, ChevronRight, Phone, MapPin, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import type { CustomerMonthlyMetricDto } from '@unipro-crm/shared-types';
import { customersApi } from './api';
import { fmt } from '@/shared/lib/format';

export function CustomerProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const profileQ = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.profile(id),
    enabled: !!id,
  });

  const ordersQ = useQuery({
    queryKey: ['customer-orders', id, page],
    queryFn: () => customersApi.orders(id, page, pageSize),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  if (profileQ.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (profileQ.error || !profileQ.data) {
    return (
      <div className="alert alert-error">
        <span>Клієнта не знайдено</span>
      </div>
    );
  }

  const c = profileQ.data;
  const s = c.stats;
  const totalPages = ordersQ.data ? Math.max(1, Math.ceil(ordersQ.data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content">
        <ArrowLeft size={14} />
        До списку
      </Link>

      {/* Profile header */}
      <div className="card-elevated px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary md:h-12 md:w-12 md:text-xl">
              {c.displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold md:text-xl">{c.displayName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {c.cardNumber && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Receipt size={10} />
                    {c.cardNumber}
                  </span>
                )}
                {c.code && (
                  <span className="rounded-full bg-base-200 px-2.5 py-0.5 font-mono text-xs text-base-content/60">
                    {c.code}
                  </span>
                )}
                {c.groupName && (
                  <span className="rounded-full bg-base-200 px-2.5 py-0.5 text-xs text-base-content/60">
                    {c.groupName}
                  </span>
                )}
                <span className="rounded-full bg-base-200 px-2.5 py-0.5 text-xs text-base-content/40">
                  Unipro #{c.externalId}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-base-content/40 md:text-right">
            Синхр.: {fmt.datetime(c.syncedAt)}
          </div>
        </div>

        {(c.phones.length > 0 || c.addresses.length > 0 || c.edrpou || c.inn) && (
          <div className="mt-4 flex flex-col gap-3 border-t border-base-200 pt-4 text-sm md:flex-row md:flex-wrap md:gap-6">
            {c.phones.length > 0 && (
              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-base-content/30" />
                <div className="space-y-0.5">
                  {c.phones.map((p, i) => <div key={i} className="font-mono text-xs">{p}</div>)}
                </div>
              </div>
            )}
            {c.addresses.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-base-content/30" />
                <div className="space-y-0.5">
                  {c.addresses.map((a, i) => <div key={i} className="text-xs">{a}</div>)}
                </div>
              </div>
            )}
            {(c.edrpou || c.inn) && (
              <div className="flex items-start gap-2">
                <Building2 size={14} className="mt-0.5 shrink-0 text-base-content/30" />
                <div className="space-y-0.5 text-xs">
                  {c.edrpou && <div>ЄДРПОУ: {c.edrpou}</div>}
                  {c.inn && <div>ІПН: {c.inn}</div>}
                </div>
              </div>
            )}
            {c.description && (
              <div className="text-xs text-base-content/60">{c.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Виторг (нетто)" value={fmt.money(s.netRevenue)} hint={s.returnsSum > 0 ? `з ${fmt.money(s.salesSum)}` : undefined} />
        <Kpi
          label="Прибуток"
          value={fmt.money(s.grossProfit)}
          hint={`собівартість ${fmt.money(s.cogs)}${s.marginPct !== null ? ` · маржа ${s.marginPct.toFixed(1)}%` : ''}`}
          accent="emerald"
        />
        <Kpi label="Чеків" value={fmt.num(s.ordersCount)} hint={`в ${s.uniqueStores} магазині`} />
        <Kpi
          label="Остання покупка"
          value={s.lastPurchaseAt ? fmt.date(s.lastPurchaseAt) : '—'}
          hint={fmt.relativeDays(s.daysSinceLastPurchase)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Середній чек" value={s.ordersCount > 0 ? fmt.money(s.avgOrderValue, 2) : '—'} />
        <Kpi label="Собівартість" value={fmt.money(s.cogs)} />
        <Kpi label="Повернень" value={fmt.money(s.returnsSum)} />
        <Kpi
          label="Маржинальність"
          value={s.marginPct !== null ? s.marginPct.toFixed(1) + '%' : '—'}
        />
      </div>

      {/* Monthly dynamics */}
      <MonthlyDynamicsSection customerId={id} />

      {/* Orders */}
      <div className="card-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4">
          <h2 className="text-sm font-semibold">Історія операцій</h2>
          <span className="text-xs text-base-content/40">Всього: {ordersQ.data?.total ?? '—'}</span>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden">
          {ordersQ.isLoading && (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner text-primary" />
            </div>
          )}
          {ordersQ.data && ordersQ.data.items.length === 0 && (
            <div className="py-10 text-center text-sm text-base-content/40">
              У цього клієнта немає документів
            </div>
          )}
          <ul className="divide-y divide-base-200">
            {ordersQ.data?.items.map((o) => (
              <li key={o.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-base-content/60">{fmt.datetime(o.dateTime)}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-base-200 px-2 py-0.5 text-[11px]">{o.docTypeLabel}</span>
                      <span className="font-mono text-[11px] text-base-content/50">№ {o.docNum ?? '—'}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums">{fmt.money(o.docSum, 2)}</div>
                    <div className="text-[10px] text-base-content/40">{o.itemsCount} поз.</div>
                  </div>
                </div>
                {o.description && (
                  <div className="truncate text-[11px] text-base-content/50">{o.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="table table-sm">
            <thead>
              <tr className="border-b border-base-200 text-xs text-base-content/40">
                <th className="bg-transparent">Дата</th>
                <th className="bg-transparent">№</th>
                <th className="bg-transparent">Тип</th>
                <th className="bg-transparent text-right">Сума</th>
                <th className="bg-transparent text-right">Позицій</th>
                <th className="bg-transparent">Опис</th>
              </tr>
            </thead>
              <tbody>
                {ordersQ.isLoading && (
                  <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <span className="loading loading-spinner text-primary" />
                  </td>
                </tr>
              )}
              {ordersQ.data?.items.map((o) => (
                <tr key={o.id} className="border-b border-base-100 hover:bg-base-100/60">
                  <td className="whitespace-nowrap text-xs">{fmt.datetime(o.dateTime)}</td>
                  <td className="font-mono text-xs text-base-content/60">{o.docNum ?? '—'}</td>
                  <td>
                    <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs">{o.docTypeLabel}</span>
                  </td>
                  <td className="text-right tabular-nums text-sm font-semibold">
                    {fmt.money(o.docSum, 2)}
                  </td>
                  <td className="text-right tabular-nums text-xs">{o.itemsCount}</td>
                  <td className="max-w-xs truncate text-xs text-base-content/50">
                    {o.description ?? ''}
                  </td>
                </tr>
              ))}
              {ordersQ.data && ordersQ.data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-base-content/40">
                    У цього клієнта немає документів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {ordersQ.data && ordersQ.data.total > pageSize && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-base-200 px-4 py-3 sm:flex-row sm:px-5">
            <span className="text-xs text-base-content/40">
              Сторінка {page} з {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-xs rounded-lg"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-medium">{page}</span>
              <button
                className="btn btn-ghost btn-xs rounded-lg"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: 'emerald' }) {
  return (
    <div className="card-elevated p-4 md:p-5">
      <div className="mb-1.5 text-[11px] font-medium text-base-content/50 md:mb-2 md:text-xs">{label}</div>
      <div
        className={`text-lg font-bold tabular-nums tracking-tight md:text-2xl ${
          accent === 'emerald' ? 'text-emerald-600' : ''
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-base-content/40 md:text-xs">{hint}</div>}
    </div>
  );
}

const MONTH_PRESETS: Array<{ value: number; label: string }> = [
  { value: 6, label: '6 міс.' },
  { value: 12, label: '12 міс.' },
  { value: 24, label: '24 міс.' },
];

const MONTH_NAMES = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

function formatMonthLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

function MonthlyDynamicsSection({ customerId }: { customerId: string }) {
  const [months, setMonths] = useState(12);
  const q = useQuery({
    queryKey: ['customer-monthly', customerId, months],
    queryFn: () => customersApi.monthly(customerId, { months }),
    enabled: !!customerId,
  });

  const data = q.data?.months ?? [];
  const maxNet = data.reduce((acc, m) => Math.max(acc, Math.max(0, m.netRevenue)), 0);
  const totalNet = data.reduce((acc, m) => acc + m.netRevenue, 0);
  const totalOrders = data.reduce((acc, m) => acc + m.ordersCount, 0);
  const totalProfit = data.reduce((acc, m) => acc + m.grossProfit, 0);
  const half = Math.floor(data.length / 2);
  const recentNet = data.slice(half).reduce((acc, m) => acc + m.netRevenue, 0);
  const earlierNet = data.slice(0, half).reduce((acc, m) => acc + m.netRevenue, 0);
  const trendUp = recentNet >= earlierNet;

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
        <div>
          <h2 className="text-sm font-semibold">Динаміка по місяцях</h2>
          <p className="text-[11px] text-base-content/50">Виторг / прибуток / кількість чеків</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {MONTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setMonths(p.value)}
              className={`btn btn-xs rounded-xl ${months === p.value ? 'btn-primary' : 'btn-ghost border border-base-300/60'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading && (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner text-primary" />
        </div>
      )}

      {q.data && data.length === 0 && (
        <div className="py-10 text-center text-sm text-base-content/40">
          За обраний період немає продажів
        </div>
      )}

      {data.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 border-t border-base-200 px-4 py-3 md:grid-cols-4 md:px-5">
            <SmallStat label="Виторг за період" value={fmt.money(totalNet)} />
            <SmallStat label="Прибуток за період" value={fmt.money(totalProfit)} accent="emerald" />
            <SmallStat label="Чеків за період" value={fmt.num(totalOrders)} />
            <SmallStat
              label={trendUp ? 'Тренд виторгу' : 'Тренд виторгу'}
              value={half > 0 && earlierNet > 0
                ? `${trendUp ? '+' : ''}${(((recentNet - earlierNet) / earlierNet) * 100).toFixed(1)}%`
                : '—'}
              accent={trendUp ? 'emerald' : 'rose'}
              icon={trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            />
          </div>

          {/* Bar chart */}
          <div className="border-t border-base-200 px-4 py-4 md:px-5">
            <div className="flex h-32 items-end gap-1 md:h-40 md:gap-1.5">
              {data.map((m) => {
                const h = maxNet > 0 ? Math.max(2, (Math.max(0, m.netRevenue) / maxNet) * 100) : 2;
                return (
                  <div
                    key={m.month}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    title={`${formatMonthLabel(m.month)}: ${fmt.money(m.netRevenue)} · ${fmt.num(m.ordersCount)} чеків`}
                  >
                    <div
                      className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1 md:gap-1.5">
              {data.map((m, i) => (
                <div
                  key={m.month}
                  className={`flex-1 truncate text-center text-[9px] md:text-[10px] ${i % Math.max(1, Math.ceil(data.length / 12)) === 0 ? 'text-base-content/50' : 'text-transparent'}`}
                >
                  {formatMonthLabel(m.month)}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="hidden overflow-x-auto border-t border-base-200 md:block">
            <table className="table table-sm">
              <thead>
                <tr className="border-b border-base-200 text-xs text-base-content/40">
                  <th className="bg-transparent">Місяць</th>
                  <th className="bg-transparent text-right">Чеків</th>
                  <th className="bg-transparent text-right">Виторг</th>
                  <th className="bg-transparent text-right">Повернень</th>
                  <th className="bg-transparent text-right">Нетто</th>
                  <th className="bg-transparent text-right">Прибуток</th>
                  <th className="bg-transparent text-right">Маржа</th>
                  <th className="bg-transparent text-right">Сер. чек</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((m) => (
                  <tr key={m.month} className="border-b border-base-100 hover:bg-base-100/60">
                    <td className="whitespace-nowrap text-xs">{formatMonthLabel(m.month)}</td>
                    <td className="text-right tabular-nums text-xs">{fmt.num(m.ordersCount)}</td>
                    <td className="text-right tabular-nums text-xs">{fmt.money(m.salesSum)}</td>
                    <td className="text-right tabular-nums text-xs text-base-content/50">{m.returnsSum > 0 ? fmt.money(m.returnsSum) : '—'}</td>
                    <td className="text-right tabular-nums text-xs font-semibold">{fmt.money(m.netRevenue)}</td>
                    <td className="text-right tabular-nums text-xs text-emerald-600">{fmt.money(m.grossProfit)}</td>
                    <td className="text-right tabular-nums text-xs text-base-content/60">
                      {m.marginPct !== null ? m.marginPct.toFixed(1) + '%' : '—'}
                    </td>
                    <td className="text-right tabular-nums text-xs text-base-content/60">
                      {m.ordersCount > 0 ? fmt.money(m.avgOrderValue, 2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile compact list */}
          <ul className="divide-y divide-base-200 border-t border-base-200 md:hidden">
            {[...data].reverse().map((m: CustomerMonthlyMetricDto) => (
              <li key={m.month} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="text-xs font-medium">{formatMonthLabel(m.month)}</div>
                  <div className="text-[10px] text-base-content/50">{fmt.num(m.ordersCount)} чеків</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold tabular-nums">{fmt.money(m.netRevenue)}</div>
                  <div className="text-[10px] tabular-nums text-emerald-600">
                    +{fmt.money(m.grossProfit)}{m.marginPct !== null && (
                      <span className="ml-1 text-base-content/40">({m.marginPct.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SmallStat({ label, value, accent, icon }: { label: string; value: string; accent?: 'emerald' | 'rose'; icon?: React.ReactNode }) {
  const color = accent === 'emerald' ? 'text-emerald-600' : accent === 'rose' ? 'text-rose-600' : '';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-base-content/40">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums md:text-base ${color}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
