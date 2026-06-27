const UAH = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 0,
});

const UAH2 = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

const NUM2 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

const DATE = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATETIME = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const fmt = {
  money(v: number | null | undefined, fraction: 0 | 2 = 0): string {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return (fraction === 2 ? UAH2 : UAH).format(v);
  },
  num(v: number | null | undefined, fraction: 0 | 2 = 0): string {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return (fraction === 2 ? NUM2 : NUM).format(v);
  },
  date(iso: string | null | undefined): string {
    if (!iso) return '—';
    return DATE.format(new Date(iso));
  },
  datetime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return DATETIME.format(new Date(iso));
  },
  /** "12 днів тому" / "сьогодні" */
  relativeDays(days: number | null | undefined): string {
    if (days === null || days === undefined) return '—';
    if (days === 0) return 'сьогодні';
    if (days === 1) return 'вчора';
    if (days < 7) return `${days} дн. тому`;
    if (days < 30) return `${Math.floor(days / 7)} тиж. тому`;
    if (days < 365) return `${Math.floor(days / 30)} міс. тому`;
    return `${Math.floor(days / 365)} р. тому`;
  },
  /** Дельта між поточним і попереднім значенням у відсотках. */
  delta(curr: number, prev: number | null | undefined): { value: number; positive: boolean } | null {
    if (prev === null || prev === undefined || prev === 0) return null;
    const value = ((curr - prev) / prev) * 100;
    return { value, positive: value >= 0 };
  },
};
