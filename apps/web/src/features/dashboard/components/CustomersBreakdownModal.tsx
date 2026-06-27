import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import type { DashboardPeriod } from '@unipro-crm/shared-types';
import { dashboardApi } from '../api';
import { fmt } from '@/shared/lib/format';

interface Props {
  open: boolean;
  period: DashboardPeriod;
  periodLabel: string;
  onClose: () => void;
}

interface Selected {
  partnerId: number;
  displayName: string;
  customerId: string | null;
}

const PAGE_SIZE = 50;

export function CustomersBreakdownModal({ open, period, periodLabel, onClose }: Props) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Selected | null>(null);

  // Reset state when modal closes or period changes
  useEffect(() => {
    if (!open) {
      setPage(1);
      setSelected(null);
    }
  }, [open]);
  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [period]);

  const listQ = useQuery({
    queryKey: ['dashboard-customers', period, page],
    queryFn: () => dashboardApi.customers(period, page, PAGE_SIZE),
    enabled: open && !selected,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const itemsQ = useQuery({
    queryKey: ['dashboard-customer-items', selected?.partnerId, period],
    queryFn: () => dashboardApi.customerItems(selected!.partnerId, period),
    enabled: open && selected !== null,
    refetchOnWindowFocus: false,
  });

  if (!open) return null;

  const totalPages = listQ.data ? Math.max(1, Math.ceil(listQ.data.total / PAGE_SIZE)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-3"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-base-100 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {selected && (
              <button
                className="btn btn-ghost btn-sm btn-square rounded-xl"
                onClick={() => setSelected(null)}
                aria-label="Назад"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold sm:text-base">
                {selected ? selected.displayName : 'Клієнти за період'}
              </h2>
              <p className="truncate text-[11px] text-base-content/50 sm:text-xs">
                {selected ? 'Що саме купив за цей період' : `Хто і на яку суму купив · ${periodLabel}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {selected?.customerId && (
              <Link
                to={`/customers/${selected.customerId}`}
                className="btn btn-ghost btn-sm btn-square gap-1.5 rounded-xl text-xs sm:btn-square-md sm:w-auto sm:px-3"
                onClick={onClose}
                aria-label="Профіль"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">Профіль</span>
              </Link>
            )}
            <button
              className="btn btn-ghost btn-sm btn-square rounded-xl"
              onClick={onClose}
              aria-label="Закрити"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {selected ? <ItemsView /> : <ListView />}
        </div>

        {/* Footer pagination (list view only) */}
        {!selected && listQ.data && listQ.data.total > PAGE_SIZE && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-base-200 px-4 py-3 sm:flex-row sm:px-5">
            <span className="text-xs text-base-content/40">
              Сторінка {page} з {totalPages} · {listQ.data.total} клієнтів
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

  function ListView() {
    if (listQ.isLoading) {
      return (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      );
    }
    if (listQ.error) {
      return (
        <div className="alert alert-error m-5 text-sm">
          <span>Помилка завантаження</span>
        </div>
      );
    }
    if (!listQ.data || listQ.data.items.length === 0) {
      return (
        <div className="py-16 text-center text-sm text-base-content/40">
          За цей період немає продажів з прив'язкою до клієнтів
        </div>
      );
    }
    return (
      <>
        {/* Mobile: card list */}
        <ul className="divide-y divide-base-200 md:hidden">
          {listQ.data.items.map((c, i) => (
            <li
              key={c.partnerId}
              className="flex cursor-pointer items-start gap-3 px-4 py-3 active:bg-base-200/60"
              onClick={() =>
                setSelected({
                  partnerId: c.partnerId,
                  displayName: c.displayName,
                  customerId: c.customerId,
                })
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-[10px] font-semibold text-base-content/60">
                {(page - 1) * PAGE_SIZE + i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{c.displayName}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-base-content/50">
                  {c.cardNumber && <span className="font-mono">{c.cardNumber}</span>}
                  <span>{fmt.num(c.ordersCount)} чеків</span>
                  {c.lastPurchaseAt && <span>{fmt.date(c.lastPurchaseAt)}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-primary">
                  {fmt.money(c.netRevenue)}
                </div>
                {c.returnsSum > 0 && (
                  <div className="text-[10px] text-base-content/40">
                    поверн.: {fmt.money(c.returnsSum)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <table className="hidden table table-sm md:table">
          <thead>
            <tr className="border-b border-base-200 text-xs text-base-content/40">
              <th className="bg-transparent">#</th>
              <th className="bg-transparent">Клієнт</th>
              <th className="bg-transparent">Картка</th>
              <th className="bg-transparent text-right">Чеків</th>
              <th className="bg-transparent text-right">Виторг</th>
              <th className="bg-transparent">Остання покупка</th>
            </tr>
          </thead>
          <tbody>
          {listQ.data.items.map((c, i) => (
            <tr
              key={c.partnerId}
              className="cursor-pointer border-b border-base-100 hover:bg-base-200/60"
              onClick={() =>
                setSelected({
                  partnerId: c.partnerId,
                  displayName: c.displayName,
                  customerId: c.customerId,
                })
              }
              title="Натисніть, щоб побачити що саме купив"
            >
              <td className="text-xs text-base-content/40">{(page - 1) * PAGE_SIZE + i + 1}</td>
              <td>
                <div className="text-sm font-medium">{c.displayName}</div>
              </td>
              <td className="font-mono text-xs text-base-content/60">{c.cardNumber ?? '—'}</td>
              <td className="text-right tabular-nums text-xs">{fmt.num(c.ordersCount)}</td>
              <td className="text-right">
                <span className="text-sm font-semibold tabular-nums text-primary underline-offset-2 hover:underline">
                  {fmt.money(c.netRevenue)}
                </span>
                {c.returnsSum > 0 && (
                  <div className="text-[10px] text-base-content/40">
                    повернень: {fmt.money(c.returnsSum)}
                  </div>
                )}
              </td>
              <td className="text-xs text-base-content/60">{fmt.date(c.lastPurchaseAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </>
    );
  }

  function ItemsView() {
    if (itemsQ.isLoading) {
      return (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      );
    }
    if (itemsQ.error) {
      return (
        <div className="alert alert-error m-5 text-sm">
          <span>Помилка завантаження</span>
        </div>
      );
    }
    if (!itemsQ.data || itemsQ.data.items.length === 0) {
      return (
        <div className="py-16 text-center text-sm text-base-content/40">
          Немає позицій за цей період
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-3 gap-2 border-b border-base-200 bg-base-200/30 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
          <Stat label="Сума" value={fmt.money(itemsQ.data.totalRevenue)} />
          <Stat label="Кількість" value={fmt.num(itemsQ.data.totalQtty, 2)} />
          <Stat label="Позицій" value={fmt.num(itemsQ.data.items.length)} />
        </div>

        {/* Mobile: card list */}
        <ul className="divide-y divide-base-200 md:hidden">
          {itemsQ.data.items.map((it, i) => (
            <li key={it.goodId} className="flex items-start gap-3 px-4 py-3">
              <span className="shrink-0 text-[11px] text-base-content/40">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{it.name ?? `Товар #${it.goodId}`}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-base-content/50">
                  <span className="font-mono">{it.code ?? '—'}</span>
                  <span>{fmt.num(it.qtty, 2)} шт.</span>
                  <span>{fmt.num(it.ordersCount)} чеків</span>
                </div>
              </div>
              <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmt.money(it.revenue)}
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <table className="hidden table table-sm md:table">
          <thead>
            <tr className="border-b border-base-200 text-xs text-base-content/40">
              <th className="w-8 bg-transparent">#</th>
              <th className="bg-transparent">Товар</th>
              <th className="bg-transparent font-mono">Код</th>
              <th className="bg-transparent text-right">К-сть</th>
              <th className="bg-transparent text-right">Чеків</th>
              <th className="bg-transparent text-right">Сума</th>
            </tr>
          </thead>
          <tbody>
            {itemsQ.data.items.map((it, i) => (
              <tr key={it.goodId} className="border-b border-base-100 hover:bg-base-100/60">
                <td className="text-xs text-base-content/40">{i + 1}</td>
                <td className="text-sm font-medium">{it.name ?? `Товар #${it.goodId}`}</td>
                <td className="font-mono text-xs text-base-content/50">{it.code ?? '—'}</td>
                <td className="text-right tabular-nums text-xs">{fmt.num(it.qtty, 2)}</td>
                <td className="text-right tabular-nums text-xs text-base-content/60">
                  {fmt.num(it.ordersCount)}
                </td>
                <td className="text-right tabular-nums text-sm font-semibold">
                  {fmt.money(it.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-base-content/40">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums sm:text-lg">{value}</div>
    </div>
  );
}
