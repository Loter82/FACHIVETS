import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, CalendarRange } from 'lucide-react';
import type { CustomerSort } from '@unipro-crm/shared-types';
import { customersApi } from './api';
import { fmt } from '@/shared/lib/format';

const SORT_OPTIONS: Array<{ value: CustomerSort; label: string }> = [
  { value: 'revenue', label: 'За виторгом' },
  { value: 'profit', label: 'За прибутком' },
  { value: 'lastPurchase', label: 'За останньою покупкою' },
  { value: 'ordersCount', label: 'За кількістю чеків' },
  { value: 'firstPurchase', label: 'За першою покупкою' },
  { value: 'name', label: 'За назвою' },
];

const RANGE_PRESETS: Array<{ key: string; label: string; days: number | null }> = [
  { key: 'all', label: 'Увесь час', days: null },
  { key: '7d', label: '7 днів', days: 7 },
  { key: '30d', label: '30 днів', days: 30 },
  { key: '90d', label: '90 днів', days: 90 },
  { key: '365d', label: 'Рік', days: 365 },
];

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CustomersListPage() {
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [sort, setSort] = useState<CustomerSort>('revenue');
  const [hasPurchases, setHasPurchases] = useState(false);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const pageSize = 25;

  const q = useQuery({
    queryKey: ['customers', { search, sort, hasPurchases, page, from, to }],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
        sort,
        order: sort === 'name' ? 'asc' : 'desc',
        hasPurchases: hasPurchases || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / pageSize)) : 1;

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setFrom('');
      setTo('');
    } else {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - days);
      setFrom(toIsoDate(start));
      setTo(toIsoDate(today));
    }
    setPage(1);
  };

  const activePreset = (() => {
    if (!from && !to) return 'all';
    if (!from || !to) return null;
    const today = toIsoDate(new Date());
    if (to !== today) return null;
    for (const p of RANGE_PRESETS) {
      if (p.days === null) continue;
      const start = new Date();
      start.setDate(new Date().getDate() - p.days);
      if (toIsoDate(start) === from) return p.key;
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-xl">Клієнти</h1>
          <p className="mt-0.5 text-sm text-base-content/50">
            {q.data ? `${q.data.total} записів` : 'Завантаження...'}
            {(from || to) && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <CalendarRange size={10} />
                {from || '…'} — {to || '…'}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-4 py-4 md:px-5">
          <form onSubmit={onSubmitSearch} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" />
              <input
                type="search"
                placeholder="Ім'я, код, картка, телефон..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="input input-bordered input-sm w-full rounded-xl bg-base-100 pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchDraft(''); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-sm w-full rounded-xl md:w-auto">
              Шукати
            </button>

            <div className="flex flex-wrap items-center gap-3 md:ml-auto">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-lg"
                  checked={hasPurchases}
                  onChange={(e) => { setHasPurchases(e.target.checked); setPage(1); }}
                />
                <span className="text-base-content/60">З покупками</span>
              </label>
              <div className="flex items-center gap-1.5 text-sm text-base-content/40">
                <SlidersHorizontal size={13} />
                <select
                  className="select select-bordered select-sm rounded-xl bg-base-100 text-xs"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as CustomerSort); setPage(1); }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {/* Time filter */}
          <div className="mt-3 flex flex-col gap-2 border-t border-base-200 pt-3 md:flex-row md:flex-wrap md:items-center">
            <div className="flex items-center gap-1.5 text-xs text-base-content/40">
              <CalendarRange size={13} />
              <span>Період:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.days)}
                  className={`btn btn-xs rounded-xl ${activePreset === p.key ? 'btn-primary' : 'btn-ghost border border-base-300/60'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:ml-auto">
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="input input-bordered input-sm w-36 rounded-xl bg-base-100 text-xs"
                aria-label="Від дати"
              />
              <span className="text-xs text-base-content/40">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="input input-bordered input-sm w-36 rounded-xl bg-base-100 text-xs"
                aria-label="До дати"
              />
              {(from || to) && (
                <button
                  type="button"
                  onClick={() => { setFrom(''); setTo(''); setPage(1); }}
                  className="btn btn-ghost btn-xs rounded-xl"
                  title="Скинути"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden">
          {q.isLoading && (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          )}
          {q.error && (
            <div className="px-4 py-6 text-center text-sm text-error">Помилка завантаження</div>
          )}
          {q.data && q.data.items.length === 0 && (
            <div className="py-10 text-center text-sm text-base-content/40">Нічого не знайдено</div>
          )}
          <ul className="divide-y divide-base-200">
            {q.data?.items.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/customers/${c.id}`}
                  className="flex flex-col gap-1 px-4 py-3 active:bg-base-200/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-base-content">{c.displayName}</div>
                      {c.phones.length > 0 && (
                        <div className="truncate text-xs text-base-content/50">{c.phones[0]}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">{fmt.money(c.netRevenue)}</div>
                      <div className="text-[10px] text-emerald-600 tabular-nums">
                        +{fmt.money(c.grossProfit)}
                        {c.marginPct !== null && (
                          <span className="ml-1 text-base-content/40">({c.marginPct.toFixed(1)}%)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-base-content/40">
                        {fmt.num(c.ordersCount)} чеків
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-base-content/50">
                    {c.cardNumber && (
                      <span className="rounded-full bg-base-200 px-2 py-0.5 font-mono">
                        {c.cardNumber}
                      </span>
                    )}
                    {c.groupName && (
                      <span className="rounded-full bg-base-200 px-2 py-0.5">{c.groupName}</span>
                    )}
                    {c.lastPurchaseAt && (
                      <span>Ост. покупка: {fmt.date(c.lastPurchaseAt)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
            <table className="table table-sm">
              <thead>
                <tr className="border-b border-base-200 text-xs text-base-content/40">
                  <th className="bg-transparent font-medium">Клієнт</th>
                  <th className="bg-transparent font-medium">Картка / Код</th>
                  <th className="bg-transparent font-medium">Група</th>
                  <th className="bg-transparent text-right font-medium">Чеків</th>
                  <th className="bg-transparent text-right font-medium">Виторг</th>
                  <th className="bg-transparent text-right font-medium">Прибуток</th>
                  <th className="bg-transparent text-right font-medium">Маржа</th>
                  <th className="bg-transparent text-right font-medium">Сер. чек</th>
                  <th className="bg-transparent font-medium">Остання покупка</th>
                </tr>
              </thead>
              <tbody>
                {q.isLoading && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <span className="loading loading-spinner loading-md text-primary" />
                    </td>
                  </tr>
                )}
                {q.error && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-error text-sm">
                      Помилка завантаження
                    </td>
                  </tr>
                )}
                {q.data?.items.map((c) => (
                  <tr key={c.id} className="border-b border-base-100 hover:bg-base-100/60">
                    <td>
                      <Link
                        to={`/customers/${c.id}`}
                        className="font-medium text-base-content hover:text-primary"
                      >
                        {c.displayName}
                      </Link>
                      {c.phones.length > 0 && (
                        <div className="text-xs text-base-content/40">{c.phones[0]}</div>
                      )}
                    </td>
                    <td>
                      <div className="font-mono text-xs">{c.cardNumber ?? '—'}</div>
                      <div className="text-xs text-base-content/40">{c.code ?? ''}</div>
                    </td>
                    <td>
                      {c.groupName ? (
                        <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs">{c.groupName}</span>
                      ) : '—'}
                    </td>
                    <td className="text-right tabular-nums text-sm">{fmt.num(c.ordersCount)}</td>
                    <td className="text-right tabular-nums text-sm font-semibold">
                      {fmt.money(c.netRevenue)}
                    </td>
                    <td className="text-right tabular-nums text-sm font-semibold text-emerald-600">
                      {fmt.money(c.grossProfit)}
                    </td>
                    <td className="text-right tabular-nums text-xs text-base-content/60">
                      {c.marginPct !== null ? c.marginPct.toFixed(1) + '%' : '—'}
                    </td>
                    <td className="text-right tabular-nums text-xs text-base-content/60">
                      {c.ordersCount > 0 ? fmt.money(c.avgOrderValue) : '—'}
                    </td>
                    <td className="text-xs text-base-content/60">
                      {fmt.date(c.lastPurchaseAt)}
                    </td>
                  </tr>
                ))}
                {q.data && q.data.items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-base-content/40">
                      Нічого не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {q.data && q.data.total > pageSize && (
            <div className="flex flex-col items-center justify-between gap-2 border-t border-base-200 px-4 py-3 sm:flex-row sm:px-5 sm:py-4">
              <span className="text-xs text-base-content/40">
                Сторінка {page} з {totalPages} · {q.data.total} записів
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
