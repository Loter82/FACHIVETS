import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DashboardKpiDto,
  DashboardOverviewDto,
  DashboardPeriod,
  RevenueTimelinePoint,
  RevenueTimelineResponse,
  TopCustomerDto,
  TopProductDto,
} from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import { DataSourceResolverService } from '../../shared/data-source-resolver.service';
import {
  RETAIL_DOC_TYPE,
  RETURN_DOC_TYPES,
  SALE_DOC_TYPES,
  WHOLESALE_DOC_TYPE,
} from '../../shared/unipro/doc-types';

interface PeriodRange {
  from: Date;
  to: Date;
  prevFrom: Date | null;
  prevTo: Date | null;
  bucket: 'day' | 'week' | 'month';
}

interface KpiRow {
  revenue: number | string | null;
  orders_count: bigint;
  unique_customers: bigint;
  items_sold: number | string | null;
  returns_sum: number | string | null;
  retail_revenue: number | string | null;
  retail_orders: bigint;
  wholesale_revenue: number | string | null;
  wholesale_orders: bigint;
}

interface TimelineRow {
  bucket_date: Date;
  revenue: number | string | null;
  orders_count: bigint;
}

interface TopCustomerRow {
  partner_id: number;
  display_name: string | null;
  card_number: string | null;
  orders_count: bigint;
  revenue: number | string | null;
}

interface TopProductRow {
  good_id: string;
  name: string | null;
  code: string | null;
  qtty: number | string | null;
  revenue: number | string | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DataSourceResolverService,
  ) {}

  async overview(
    tenantId: string,
    sourceIdOverride: string | undefined,
    period: DashboardPeriod,
  ): Promise<DashboardOverviewDto> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const range = this.resolveRange(period);
    const [kpi, timeline, topCustomers, topProducts] = await Promise.all([
      this.kpi(tenantId, dataSourceId, period, range),
      this.timeline(tenantId, dataSourceId, period, range),
      this.topCustomers(tenantId, dataSourceId, range),
      this.topProducts(tenantId, dataSourceId, range),
    ]);
    return { kpi, timeline, topCustomers, topProducts };
  }

  async kpi(
    tenantId: string,
    dataSourceId: string,
    period: DashboardPeriod,
    range?: PeriodRange,
  ): Promise<DashboardKpiDto> {
    const r = range ?? this.resolveRange(period);
    const saleTypes = Prisma.join(SALE_DOC_TYPES.map((t) => Prisma.sql`${t}`));
    const returnTypes = Prisma.join(RETURN_DOC_TYPES.map((t) => Prisma.sql`${t}`));

    const dateFilter = r.from
      ? Prisma.sql`AND d."dateTime" >= ${r.from} AND d."dateTime" < ${r.to}`
      : Prisma.empty;

    const [rows, itemsRows] = await Promise.all([
      this.prisma.$queryRaw<KpiRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" IN (${saleTypes})), 0) AS revenue,
          COUNT(*) FILTER (WHERE d."docType" IN (${saleTypes})) AS orders_count,
          COUNT(DISTINCT d."partnerId") FILTER (WHERE d."docType" IN (${saleTypes}) AND d."partnerId" IS NOT NULL AND d."partnerId" > 0) AS unique_customers,
          0::numeric AS items_sold,
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" IN (${returnTypes})), 0) AS returns_sum,
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" = ${RETAIL_DOC_TYPE}), 0) AS retail_revenue,
          COUNT(*) FILTER (WHERE d."docType" = ${RETAIL_DOC_TYPE}) AS retail_orders,
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" = ${WHOLESALE_DOC_TYPE}), 0) AS wholesale_revenue,
          COUNT(*) FILTER (WHERE d."docType" = ${WHOLESALE_DOC_TYPE}) AS wholesale_orders
        FROM mirror_documents d
        WHERE d."tenantId" = ${tenantId}
          AND d."dataSourceId" = ${dataSourceId}
          AND d.state = 0
          ${dateFilter}
      `),
      this.prisma.$queryRaw<{ items_sold: number | string | null }[]>(Prisma.sql`
        SELECT COALESCE(SUM(i.qtty), 0) AS items_sold
        FROM mirror_document_items i
        JOIN mirror_documents d
          ON d."tenantId" = i."tenantId"
          AND d."dataSourceId" = i."dataSourceId"
          AND d."externalId" = i."externalDocId"
        WHERE i."tenantId" = ${tenantId}
          AND i."dataSourceId" = ${dataSourceId}
          AND d.state = 0
          AND d."docType" IN (${saleTypes})
          ${r.from ? Prisma.sql`AND d."dateTime" >= ${r.from} AND d."dateTime" < ${r.to}` : Prisma.empty}
      `),
    ]);
    const cur = rows[0];
    const itemsSoldRaw = itemsRows[0]?.items_sold ?? 0;

    let prev: KpiRow | null = null;
    if (r.prevFrom && r.prevTo) {
      const prevRows = await this.prisma.$queryRaw<KpiRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" IN (${saleTypes})), 0) AS revenue,
          COUNT(*) FILTER (WHERE d."docType" IN (${saleTypes})) AS orders_count,
          COUNT(DISTINCT d."partnerId") FILTER (WHERE d."docType" IN (${saleTypes}) AND d."partnerId" IS NOT NULL AND d."partnerId" > 0) AS unique_customers,
          0::numeric AS items_sold,
          COALESCE(SUM(d."docSum") FILTER (WHERE d."docType" IN (${returnTypes})), 0) AS returns_sum,
          0::numeric AS retail_revenue,
          0::bigint  AS retail_orders,
          0::numeric AS wholesale_revenue,
          0::bigint  AS wholesale_orders
        FROM mirror_documents d
        WHERE d."tenantId" = ${tenantId}
          AND d."dataSourceId" = ${dataSourceId}
          AND d.state = 0
          AND d."dateTime" >= ${r.prevFrom}
          AND d."dateTime" < ${r.prevTo}
      `);
      prev = prevRows[0] ?? null;
    }

    const revenue = Number(cur?.revenue ?? 0);
    const ordersCount = Number(cur?.orders_count ?? 0);
    const avgCheck = ordersCount > 0 ? revenue / ordersCount : 0;
    const uniqueCustomers = Number(cur?.unique_customers ?? 0);
    const itemsSold = Number(itemsSoldRaw);
    const returnsSum = Number(cur?.returns_sum ?? 0);

    const prevRevenue = prev ? Number(prev.revenue ?? 0) : null;
    const prevOrders = prev ? Number(prev.orders_count ?? 0) : null;
    const prevAvg = prev && prevOrders! > 0 ? prevRevenue! / prevOrders! : prev ? 0 : null;
    const prevUnique = prev ? Number(prev.unique_customers ?? 0) : null;

    return {
      period,
      from: r.from ? r.from.toISOString() : null,
      to: r.to ? r.to.toISOString() : null,
      revenue,
      ordersCount,
      avgCheck,
      uniqueCustomers,
      itemsSold,
      returnsSum,
      retailRevenue: Number(cur?.retail_revenue ?? 0),
      retailOrders: Number(cur?.retail_orders ?? 0),
      wholesaleRevenue: Number(cur?.wholesale_revenue ?? 0),
      wholesaleOrders: Number(cur?.wholesale_orders ?? 0),
      revenuePrev: prevRevenue,
      ordersCountPrev: prevOrders,
      avgCheckPrev: prevAvg,
      uniqueCustomersPrev: prevUnique,
    };
  }

  async timeline(
    tenantId: string,
    dataSourceId: string,
    period: DashboardPeriod,
    range?: PeriodRange,
  ): Promise<RevenueTimelineResponse> {
    const r = range ?? this.resolveRange(period);
    const saleTypes = Prisma.join(SALE_DOC_TYPES.map((t) => Prisma.sql`${t}`));
    const truncUnit = r.bucket === 'day' ? 'day' : r.bucket === 'week' ? 'week' : 'month';

    const from = r.from ?? new Date(Date.UTC(2000, 0, 1));
    const to = r.to;

    const rows = await this.prisma.$queryRaw<TimelineRow[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, d."dateTime")::timestamp AS bucket_date,
        COALESCE(SUM(d."docSum"), 0) AS revenue,
        COUNT(*) AS orders_count
      FROM mirror_documents d
      WHERE d."tenantId" = ${tenantId}
        AND d."dataSourceId" = ${dataSourceId}
        AND d.state = 0
        AND d."docType" IN (${saleTypes})
        AND d."dateTime" >= ${from}
        AND d."dateTime" < ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const points: RevenueTimelinePoint[] = rows.map((row) => ({
      date: row.bucket_date.toISOString(),
      revenue: Number(row.revenue ?? 0),
      ordersCount: Number(row.orders_count ?? 0),
    }));

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: r.bucket,
      points,
    };
  }

  async topCustomers(
    tenantId: string,
    dataSourceId: string,
    range: PeriodRange,
    limit = 10,
  ): Promise<TopCustomerDto[]> {
    const saleTypes = Prisma.join(SALE_DOC_TYPES.map((t) => Prisma.sql`${t}`));
    const dateFilter = range.from
      ? Prisma.sql`AND d."dateTime" >= ${range.from} AND d."dateTime" < ${range.to}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<TopCustomerRow[]>(Prisma.sql`
      SELECT
        d."partnerId" AS partner_id,
        p."displayName" AS display_name,
        p."cardNumber" AS card_number,
        COUNT(*) AS orders_count,
        COALESCE(SUM(d."docSum"), 0) AS revenue
      FROM mirror_documents d
      LEFT JOIN mirror_partners p
        ON p."tenantId" = d."tenantId"
        AND p."dataSourceId" = d."dataSourceId"
        AND p."externalId" = d."partnerId"
      WHERE d."tenantId" = ${tenantId}
        AND d."dataSourceId" = ${dataSourceId}
        AND d.state = 0
        AND d."docType" IN (${saleTypes})
        AND d."partnerId" IS NOT NULL
        AND d."partnerId" > 0
        ${dateFilter}
      GROUP BY d."partnerId", p."displayName", p."cardNumber"
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      partnerId: r.partner_id,
      displayName: r.display_name ?? `Партнер #${r.partner_id}`,
      cardNumber: r.card_number,
      ordersCount: Number(r.orders_count ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));
  }

  async topProducts(
    tenantId: string,
    dataSourceId: string,
    range: PeriodRange,
    limit = 10,
  ): Promise<TopProductDto[]> {
    const saleTypes = Prisma.join(SALE_DOC_TYPES.map((t) => Prisma.sql`${t}`));
    const dateFilter = range.from
      ? Prisma.sql`AND d."dateTime" >= ${range.from} AND d."dateTime" < ${range.to}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
      SELECT
        i."externalGoodId"::text AS good_id,
        g.name AS name,
        g.code AS code,
        COALESCE(SUM(i.qtty), 0) AS qtty,
        COALESCE(SUM(i.sum), 0) AS revenue
      FROM mirror_document_items i
      JOIN mirror_documents d
        ON d."tenantId" = i."tenantId"
        AND d."dataSourceId" = i."dataSourceId"
        AND d."externalId" = i."externalDocId"
      LEFT JOIN mirror_goods g
        ON g."tenantId" = i."tenantId"
        AND g."dataSourceId" = i."dataSourceId"
        AND g."externalId"::bigint = i."externalGoodId"
      WHERE i."tenantId" = ${tenantId}
        AND i."dataSourceId" = ${dataSourceId}
        AND d.state = 0
        AND d."docType" IN (${saleTypes})
        ${dateFilter}
      GROUP BY i."externalGoodId", g.name, g.code
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      goodId: Number(r.good_id),
      name: r.name,
      code: r.code,
      qtty: Number(r.qtty ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));
  }

  private resolveRange(period: DashboardPeriod): PeriodRange {
    const now = new Date();
    const to = now;
    let from: Date;
    let prevFrom: Date | null = null;
    let prevTo: Date | null = null;
    let bucket: 'day' | 'week' | 'month' = 'day';
    const startOfDay = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    switch (period) {
      case 'today': {
        from = startOfDay(now);
        const oneDay = 86_400_000;
        prevFrom = new Date(from.getTime() - oneDay);
        prevTo = from;
        bucket = 'day';
        break;
      }
      case 'week': {
        from = new Date(startOfDay(now).getTime() - 6 * 86_400_000);
        prevTo = from;
        prevFrom = new Date(from.getTime() - 7 * 86_400_000);
        bucket = 'day';
        break;
      }
      case 'quarter': {
        from = new Date(startOfDay(now).getTime() - 89 * 86_400_000);
        prevTo = from;
        prevFrom = new Date(from.getTime() - 90 * 86_400_000);
        bucket = 'week';
        break;
      }
      case 'year': {
        from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
        prevTo = from;
        prevFrom = new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate()));
        bucket = 'month';
        break;
      }
      case 'all': {
        from = new Date(Date.UTC(2000, 0, 1));
        bucket = 'month';
        break;
      }
      case 'month':
      default: {
        from = new Date(startOfDay(now).getTime() - 29 * 86_400_000);
        prevTo = from;
        prevFrom = new Date(from.getTime() - 30 * 86_400_000);
        bucket = 'day';
        break;
      }
    }

    return { from, to, prevFrom, prevTo, bucket };
  }
}
