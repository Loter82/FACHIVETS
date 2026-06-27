import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, Store, Receipt, ChevronLeft, ChevronRight, Phone, MapPin, Building2 } from 'lucide-react';
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
      <div className="card-elevated px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {c.displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{c.displayName}</h1>
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
          <div className="text-right text-xs text-base-content/40">
            Синхр.: {fmt.datetime(c.syncedAt)}
          </div>
        </div>

        {(c.phones.length > 0 || c.addresses.length > 0 || c.edrpou || c.inn) && (
          <div className="mt-4 flex flex-wrap gap-6 border-t border-base-200 pt-4 text-sm">
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
        <Kpi label="Чеків" value={fmt.num(s.ordersCount)} hint={`в ${s.uniqueStores} магазині`} />
        <Kpi label="Середній чек" value={s.ordersCount > 0 ? fmt.money(s.avgOrderValue, 2) : '—'} />
        <Kpi
          label="Остання покупка"
          value={s.lastPurchaseAt ? fmt.date(s.lastPurchaseAt) : '—'}
          hint={fmt.relativeDays(s.daysSinceLastPurchase)}
        />
      </div>

      {/* Orders */}
      <div className="card-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-semibold">Історія операцій</h2>
          <span className="text-xs text-base-content/40">Всього: {ordersQ.data?.total ?? '—'}</span>
        </div>

        <div className="overflow-x-auto">
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
          <div className="flex items-center justify-between border-t border-base-200 px-5 py-3">
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

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-2 text-xs font-medium text-base-content/50">{label}</div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-base-content/40">{hint}</div>}
    </div>
  );
}
