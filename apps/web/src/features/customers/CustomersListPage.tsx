import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { CustomerSort } from '@unipro-crm/shared-types';
import { customersApi } from './api';
import { fmt } from '@/shared/lib/format';

const SORT_OPTIONS: Array<{ value: CustomerSort; label: string }> = [
  { value: 'revenue', label: 'За виторгом' },
  { value: 'lastPurchase', label: 'За останньою покупкою' },
  { value: 'ordersCount', label: 'За кількістю чеків' },
  { value: 'firstPurchase', label: 'За першою покупкою' },
  { value: 'name', label: 'За назвою' },
];

export function CustomersListPage() {
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [sort, setSort] = useState<CustomerSort>('revenue');
  const [hasPurchases, setHasPurchases] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const q = useQuery({
    queryKey: ['customers', { search, sort, hasPurchases, page }],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
        sort,
        order: sort === 'name' ? 'asc' : 'desc',
        hasPurchases: hasPurchases || undefined,
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Клієнти</h1>
          <p className="mt-0.5 text-sm text-base-content/50">
            {q.data ? `${q.data.total} записів` : 'Завантаження...'}
          </p>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4">
          <form onSubmit={onSubmitSearch} className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" />
              <input
                type="search"
                placeholder="Ім'я, код, картка, телефон..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="input input-bordered input-sm rounded-xl pl-9 pr-4 w-72 bg-base-100"
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
            <button type="submit" className="btn btn-primary btn-sm rounded-xl">
              Шукати
            </button>

            <div className="ml-auto flex items-center gap-3">
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
        </div>

        <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="border-b border-base-200 text-xs text-base-content/40">
                  <th className="bg-transparent font-medium">Клієнт</th>
                  <th className="bg-transparent font-medium">Картка / Код</th>
                  <th className="bg-transparent font-medium">Група</th>
                  <th className="bg-transparent text-right font-medium">Чеків</th>
                  <th className="bg-transparent text-right font-medium">Виторг</th>
                  <th className="bg-transparent text-right font-medium">Сер. чек</th>
                  <th className="bg-transparent font-medium">Остання покупка</th>
                </tr>
              </thead>
              <tbody>
                {q.isLoading && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <span className="loading loading-spinner loading-md text-primary" />
                    </td>
                  </tr>
                )}
                {q.error && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-error text-sm">
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
                    <td colSpan={7} className="py-10 text-center text-sm text-base-content/40">
                      Нічого не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {q.data && q.data.total > pageSize && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-base-200">
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
