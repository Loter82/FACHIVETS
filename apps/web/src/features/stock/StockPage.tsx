import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  PackageCheck,
  PackageX,
  Search,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { StockListQuery, StockSort } from '@unipro-crm/shared-types';
import { stockApi } from './api';
import { fmt } from '@/shared/lib/format';

const PRESENCE_OPTIONS: Array<{ value: NonNullable<StockListQuery['presence']>; label: string }> = [
  { value: 'all', label: 'Усі' },
  { value: 'in', label: 'В наявності' },
  { value: 'out', label: 'Закінчилось' },
  { value: 'negative', label: 'Мінус' },
];

const SORT_OPTIONS: Array<{ value: StockSort; label: string }> = [
  { value: 'valueCost', label: 'За вартістю (собівартість)' },
  { value: 'valueSale', label: 'За вартістю (продажна)' },
  { value: 'margin', label: 'За маржею' },
  { value: 'qtty', label: 'За кількістю' },
  { value: 'name', label: 'За назвою' },
  { value: 'lastSaleAt', label: 'За останнім продажем' },
];

export function StockPage() {
  const [tab, setTab] = useState<'items' | 'groups' | 'analytics'>('items');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-xl">Залишки товарів</h1>
          <p className="mt-0.5 text-sm text-base-content/50">
            Поточні залишки по складах, асортимент по групах, аналітика
          </p>
        </div>
      </div>

      <SummaryStrip />

      <div role="tablist" className="tabs tabs-boxed bg-base-100 ring-1 ring-base-content/10">
        <button
          role="tab"
          onClick={() => setTab('items')}
          className={`tab ${tab === 'items' ? 'tab-active' : ''}`}
        >
          Список товарів
        </button>
        <button
          role="tab"
          onClick={() => setTab('groups')}
          className={`tab ${tab === 'groups' ? 'tab-active' : ''}`}
        >
          По групах
        </button>
        <button
          role="tab"
          onClick={() => setTab('analytics')}
          className={`tab ${tab === 'analytics' ? 'tab-active' : ''}`}
        >
          Аналітика
        </button>
      </div>

      {tab === 'items' && <ItemsTab />}
      {tab === 'groups' && <GroupsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary KPI strip
// ---------------------------------------------------------------------------

function SummaryStrip() {
  const q = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary(),
  });

  const d = q.data;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        icon={<Tag size={16} className="text-base-content/40" />}
        label="SKU всього"
        value={d ? fmt.num(d.totalSkus) : '—'}
        hint={
          d
            ? `${fmt.num(d.positiveSkus)} в наявності, ${fmt.num(d.zeroSkus)} нульових${d.negativeSkus > 0 ? `, ${fmt.num(d.negativeSkus)} мінус` : ''}`
            : ''
        }
      />
      <KpiCard
        icon={<PackageCheck size={16} className="text-base-content/40" />}
        label="Загальна кількість"
        value={d ? fmt.num(d.totalQtty, 2) : '—'}
      />
      <KpiCard
        icon={<Wallet size={16} className="text-base-content/40" />}
        label="Вартість (собівартість)"
        value={d ? fmt.money(d.totalValueCost) : '—'}
        hint={d ? `Продажна: ${fmt.money(d.totalValueSale)}` : ''}
      />
      <KpiCard
        icon={<TrendingUp size={16} className="text-base-content/40" />}
        label="Потенційна маржа"
        value={d ? fmt.money(d.potentialMarginAmount) : '—'}
        hint={d ? `${fmt.num(d.potentialMarginPct, 2)}%` : ''}
      />
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-elevated px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-base-content/50">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-base-content/50">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ITEMS TAB
// ---------------------------------------------------------------------------

function ItemsTab() {
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [presence, setPresence] = useState<NonNullable<StockListQuery['presence']>>('in');
  const [sort, setSort] = useState<StockSort>('valueCost');
  const [storeFilter, setStoreFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const summary = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary(),
  });

  const stores = summary.data?.stores ?? [];

  const q = useQuery({
    queryKey: ['stock-items', { search, presence, sort, storeFilter, page }],
    queryFn: () =>
      stockApi.list({
        search: search || undefined,
        presence,
        sort,
        order: sort === 'name' ? 'asc' : 'desc',
        storeId: storeFilter,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / pageSize)) : 1;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-4 md:px-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" />
            <input
              type="search"
              placeholder="Назва або код товару..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="input input-bordered input-sm w-full rounded-xl bg-base-100 pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchDraft('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm w-full rounded-xl md:w-auto">
            Шукати
          </button>

          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <select
              value={presence}
              onChange={(e) => {
                setPresence(e.target.value as NonNullable<StockListQuery['presence']>);
                setPage(1);
              }}
              className="select select-bordered select-sm rounded-xl"
            >
              {PRESENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={storeFilter ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setStoreFilter(v === '' ? undefined : Number(v));
                setPage(1);
              }}
              className="select select-bordered select-sm rounded-xl"
            >
              <option value="">Усі склади</option>
              {stores.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeName ?? `Склад #${s.storeId}`}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as StockSort);
                setPage(1);
              }}
              className="select select-bordered select-sm rounded-xl"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto border-t border-base-content/5">
        <table className="table table-sm">
          <thead className="bg-base-200/40 text-xs uppercase text-base-content/60">
            <tr>
              <th>Товар</th>
              <th>Група</th>
              <th className="text-right">Кількість</th>
              <th className="text-right">Собівартість</th>
              <th className="text-right">Продажна</th>
              <th className="text-right">Маржа</th>
              <th>Склади</th>
              <th>Останній продаж</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-base-content/40">
                  Завантаження...
                </td>
              </tr>
            )}
            {!q.isLoading && q.data?.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-base-content/40">
                  Нічого не знайдено
                </td>
              </tr>
            )}
            {q.data?.rows.map((r) => (
              <tr key={r.goodId} className="hover">
                <td>
                  <div className="font-medium">{r.goodName || `Товар #${r.goodId}`}</div>
                  {r.goodCode && <div className="text-xs text-base-content/40">{r.goodCode}</div>}
                </td>
                <td className="text-sm text-base-content/70">{r.groupName ?? '—'}</td>
                <td className="text-right tabular-nums">
                  <div className={r.totalQtty < 0 ? 'font-semibold text-error' : 'font-semibold'}>
                    {fmt.num(r.totalQtty, 2)}
                  </div>
                  {r.unit && <div className="text-xs text-base-content/40">{r.unit}</div>}
                </td>
                <td className="text-right tabular-nums">
                  <div className="font-medium">{fmt.money(r.valueCost)}</div>
                  <div className="text-xs text-base-content/40">{fmt.money(r.priceIn, 2)}/шт</div>
                </td>
                <td className="text-right tabular-nums">
                  <div className="font-medium">{fmt.money(r.valueSale)}</div>
                  <div className="text-xs text-base-content/40">{fmt.money(r.priceOut, 2)}/шт</div>
                </td>
                <td className="text-right tabular-nums">
                  <div className={r.marginAmount < 0 ? 'font-medium text-error' : 'font-medium'}>
                    {fmt.money(r.marginAmount)}
                  </div>
                  <div className="text-xs text-base-content/40">{fmt.num(r.marginPct, 2)}%</div>
                </td>
                <td className="text-xs">
                  {r.stores.length === 0 ? (
                    <span className="text-base-content/40">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {r.stores.map((s) => (
                        <div key={s.storeId}>
                          <span className="text-base-content/50">{s.storeName ?? `#${s.storeId}`}:</span>{' '}
                          <span className="tabular-nums">{fmt.num(s.qtty, 2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="text-sm text-base-content/70">{fmt.date(r.lastSaleAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {q.data && q.data.total > pageSize && (
        <div className="flex items-center justify-between border-t border-base-content/5 px-4 py-3">
          <div className="text-xs text-base-content/50">
            Сторінка {page} з {totalPages} ({fmt.num(q.data.total)} записів)
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost btn-sm rounded-lg"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-ghost btn-sm rounded-lg"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GROUPS TAB
// ---------------------------------------------------------------------------

function GroupsTab() {
  const [storeFilter, setStoreFilter] = useState<number | undefined>(undefined);
  const summary = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary(),
  });
  const stores = summary.data?.stores ?? [];

  const q = useQuery({
    queryKey: ['stock-groups', storeFilter],
    queryFn: () => stockApi.groups(storeFilter),
  });

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between border-b border-base-content/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-base-content/40" />
          <span className="text-sm font-medium">Асортимент по групах</span>
        </div>
        <select
          value={storeFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setStoreFilter(v === '' ? undefined : Number(v));
          }}
          className="select select-bordered select-sm rounded-xl"
        >
          <option value="">Усі склади</option>
          {stores.map((s) => (
            <option key={s.storeId} value={s.storeId}>
              {s.storeName ?? `Склад #${s.storeId}`}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200/40 text-xs uppercase text-base-content/60">
            <tr>
              <th>Група</th>
              <th className="text-right">SKU</th>
              <th className="text-right">Кількість</th>
              <th className="text-right">Собівартість</th>
              <th className="text-right">Продажна</th>
              <th className="text-right">Маржа</th>
              <th className="text-right">Маржа %</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-base-content/40">
                  Завантаження...
                </td>
              </tr>
            )}
            {q.data?.rows.map((g) => (
              <tr key={g.groupId ?? 'none'} className="hover">
                <td className="font-medium">{g.groupName ?? '— (без групи)'}</td>
                <td className="text-right tabular-nums">{fmt.num(g.skuCount)}</td>
                <td className="text-right tabular-nums">{fmt.num(g.totalQtty, 2)}</td>
                <td className="text-right tabular-nums font-medium">{fmt.money(g.valueCost)}</td>
                <td className="text-right tabular-nums">{fmt.money(g.valueSale)}</td>
                <td className="text-right tabular-nums">{fmt.money(g.marginAmount)}</td>
                <td className="text-right tabular-nums">{fmt.num(g.marginPct, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ANALYTICS TAB
// ---------------------------------------------------------------------------

function AnalyticsTab() {
  const [windowDays, setWindowDays] = useState(90);

  const q = useQuery({
    queryKey: ['stock-analytics', windowDays],
    queryFn: () => stockApi.analytics({ windowDays, limit: 20 }),
  });

  const data = q.data;

  return (
    <div className="space-y-4">
      <div className="card-elevated flex items-center justify-between px-4 py-3">
        <div className="text-sm text-base-content/60">
          Вікно аналізу для «мертвого стоку» і «дефіциту»
        </div>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="select select-bordered select-sm rounded-xl"
        >
          <option value={30}>30 днів</option>
          <option value={60}>60 днів</option>
          <option value={90}>90 днів</option>
          <option value={180}>180 днів</option>
          <option value={365}>365 днів</option>
        </select>
      </div>

      <AnalyticsPanel
        title="Топ-20 за вартістю стоку (собівартість)"
        icon={<TrendingUp size={16} className="text-success" />}
        loading={q.isLoading}
        empty={!data?.topByValue.length}
        cols={['Товар', 'Група', 'Кількість', 'Собівартість', 'Продажна']}
        rows={
          data?.topByValue.map((r) => [
            <div key="n">
              <div className="font-medium">{r.goodName || `Товар #${r.goodId}`}</div>
            </div>,
            <span key="g" className="text-sm text-base-content/70">{r.groupName ?? '—'}</span>,
            <span key="q" className="tabular-nums">{fmt.num(r.totalQtty, 2)}</span>,
            <span key="c" className="tabular-nums font-medium">{fmt.money(r.valueCost)}</span>,
            <span key="s" className="tabular-nums">{fmt.money(r.valueSale)}</span>,
          ]) ?? []
        }
      />

      <AnalyticsPanel
        title={`Мертвий сток (немає продажів ${windowDays}+ днів)`}
        icon={<PackageX size={16} className="text-error" />}
        loading={q.isLoading}
        empty={!data?.deadStock.length}
        cols={['Товар', 'Група', 'Кількість', 'Заморожено', 'Останній продаж']}
        rows={
          data?.deadStock.map((r) => [
            <div key="n">
              <div className="font-medium">{r.goodName || `Товар #${r.goodId}`}</div>
            </div>,
            <span key="g" className="text-sm text-base-content/70">{r.groupName ?? '—'}</span>,
            <span key="q" className="tabular-nums">{fmt.num(r.totalQtty, 2)}</span>,
            <span key="c" className="tabular-nums font-medium text-error">{fmt.money(r.valueCost)}</span>,
            <span key="d" className="text-sm">
              {r.lastSaleAt ? `${fmt.date(r.lastSaleAt)} · ${r.daysSinceSale !== null ? Math.round(r.daysSinceSale) + ' дн.' : ''}` : 'ніколи'}
            </span>,
          ]) ?? []
        }
      />

      <AnalyticsPanel
        title={`Дефіцит — найшвидше закінчиться (за ${windowDays} дн.)`}
        icon={<TrendingDown size={16} className="text-warning" />}
        loading={q.isLoading}
        empty={!data?.shortage.length}
        cols={['Товар', 'Група', 'Залишок', 'Продано', 'На добу', 'Залишилось днів']}
        rows={
          data?.shortage.map((r) => [
            <div key="n">
              <div className="font-medium">{r.goodName || `Товар #${r.goodId}`}</div>
            </div>,
            <span key="g" className="text-sm text-base-content/70">{r.groupName ?? '—'}</span>,
            <span key="q" className="tabular-nums">{fmt.num(r.totalQtty, 2)}</span>,
            <span key="s" className="tabular-nums">{fmt.num(r.qttySoldWindow, 2)}</span>,
            <span key="a" className="tabular-nums">{fmt.num(r.avgDailySales, 2)}</span>,
            <span key="d" className={`tabular-nums font-medium ${r.daysOfStock !== null && r.daysOfStock < 14 ? 'text-error' : ''}`}>
              {r.daysOfStock !== null ? `${Math.round(r.daysOfStock)} дн.` : '∞'}
            </span>,
          ]) ?? []
        }
      />
    </div>
  );
}

function AnalyticsPanel({
  title,
  icon,
  loading,
  empty,
  cols,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  empty: boolean;
  cols: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center gap-2 border-b border-base-content/5 px-4 py-3">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200/40 text-xs uppercase text-base-content/60">
            <tr>
              {cols.map((c, i) => (
                <th key={c} className={i >= 2 ? 'text-right' : ''}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={cols.length} className="py-6 text-center text-sm text-base-content/40">
                  Завантаження...
                </td>
              </tr>
            )}
            {!loading && empty && (
              <tr>
                <td colSpan={cols.length} className="py-6 text-center text-sm text-base-content/40">
                  Немає даних
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx} className="hover">
                {row.map((cell, i) => (
                  <td key={i} className={i >= 2 ? 'text-right' : ''}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
