import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt } from '@/shared/lib/format';

type Bucket = 'hour' | 'day' | 'week' | 'month';

interface Point {
  date: string;
  revenue: number;
  ordersCount: number;
}

interface Props {
  points: Point[];
  bucket: Bucket;
}

const HOUR_FMT = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const DAY_FMT = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' });
const MONTH_FMT = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: '2-digit' });
const FULL_FMT = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTick(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  switch (bucket) {
    case 'hour':
      return HOUR_FMT.format(d);
    case 'month':
      return MONTH_FMT.format(d);
    default:
      return DAY_FMT.format(d);
  }
}

function compactMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function RevenueChart({ points, bucket }: Props) {
  const data = useMemo(() => points.map((p) => ({ ...p, ts: new Date(p.date).getTime() })), [points]);

  return (
    <div className="h-64 w-full px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatTick(v, bucket)}
            tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            minTickGap={bucket === 'hour' ? 24 : 16}
          />
          <YAxis
            tickFormatter={compactMoney}
            tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: '#3b82f6', strokeOpacity: 0.3, strokeWidth: 1 }}
            content={<RevenueTooltip />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}

function RevenueTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-base-200 bg-base-100 px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-base-content/40">
        {FULL_FMT.format(new Date(p.date))}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">{fmt.money(p.revenue)}</div>
      <div className="text-xs text-base-content/50">{fmt.num(p.ordersCount)} продажів</div>
    </div>
  );
}
