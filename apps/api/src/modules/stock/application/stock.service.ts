import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  StockAnalyticsQuery,
  StockAnalyticsResponse,
  StockDeadRowDto,
  StockGroupsResponse,
  StockItemDto,
  StockListQuery,
  StockListResponse,
  StockShortageRowDto,
  StockStoreRowDto,
  StockSummaryDto,
  StockTopValueRowDto,
} from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import { DataSourceResolverService } from '../../shared/data-source-resolver.service';
import { saleDocPredicateSql } from '../../shared/unipro/doc-sql';

interface SummaryRow {
  total_skus: bigint;
  positive_skus: bigint;
  zero_skus: bigint;
  negative_skus: bigint;
  total_qtty: number | string | null;
  total_value_cost: number | string | null;
  total_value_sale: number | string | null;
}

interface SummaryStoreRow {
  store_id: number;
  store_name: string | null;
  sku_count: bigint;
  total_qtty: number | string | null;
  value_cost: number | string | null;
  value_sale: number | string | null;
}

interface ListRow {
  good_id: number;
  good_code: string | null;
  good_name: string | null;
  group_id: number | null;
  group_name: string | null;
  unit: string | null;
  price_in: number | string | null;
  price_out: number | string | null;
  total_qtty: number | string | null;
  value_cost: number | string | null;
  value_sale: number | string | null;
  margin_amount: number | string | null;
  margin_pct: number | string | null;
  last_sale_at: Date | null;
}

interface StoreRow {
  good_id: number;
  store_id: number;
  store_name: string | null;
  qtty: number | string | null;
}

interface GroupRow {
  group_id: number | null;
  group_name: string | null;
  sku_count: bigint;
  total_qtty: number | string | null;
  value_cost: number | string | null;
  value_sale: number | string | null;
  margin_amount: number | string | null;
  margin_pct: number | string | null;
}

interface TopValueRow {
  good_id: number;
  good_name: string | null;
  group_name: string | null;
  total_qtty: number | string | null;
  value_cost: number | string | null;
  value_sale: number | string | null;
}

interface DeadRow {
  good_id: number;
  good_name: string | null;
  group_name: string | null;
  total_qtty: number | string | null;
  value_cost: number | string | null;
  last_sale_at: Date | null;
  days_since_sale: number | string | null;
}

interface ShortageRow {
  good_id: number;
  good_name: string | null;
  group_name: string | null;
  total_qtty: number | string | null;
  qtty_sold_window: number | string | null;
  avg_daily_sales: number | string | null;
  days_of_stock: number | string | null;
  last_sale_at: Date | null;
}

const toNum = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DataSourceResolverService,
  ) {}

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------

  async summary(tenantId: string, sourceIdOverride?: string): Promise<StockSummaryDto> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);

    const aggSql = Prisma.sql`
      WITH per_good AS (
        SELECT
          s."goodId"                                            AS good_id,
          SUM(s."qtty")                                         AS qtty,
          COALESCE(MAX(g."priceIn"), 0)                         AS price_in,
          COALESCE(MAX(g."priceOut"), 0)                        AS price_out
        FROM mirror_store_stock s
        LEFT JOIN mirror_goods g
          ON g."tenantId" = s."tenantId"
         AND g."dataSourceId" = s."dataSourceId"
         AND g."externalId" = s."goodId"
        WHERE s."tenantId" = ${tenantId}
          AND s."dataSourceId" = ${dataSourceId}
        GROUP BY s."goodId"
      )
      SELECT
        COUNT(*)::bigint                                                     AS total_skus,
        COUNT(*) FILTER (WHERE qtty > 0)::bigint                             AS positive_skus,
        COUNT(*) FILTER (WHERE qtty = 0)::bigint                             AS zero_skus,
        COUNT(*) FILTER (WHERE qtty < 0)::bigint                             AS negative_skus,
        COALESCE(SUM(qtty), 0)                                               AS total_qtty,
        COALESCE(SUM(CASE WHEN qtty > 0 THEN qtty * price_in END), 0)        AS total_value_cost,
        COALESCE(SUM(CASE WHEN qtty > 0 THEN qtty * price_out END), 0)       AS total_value_sale
      FROM per_good
    `;

    const perStoreSql = Prisma.sql`
      SELECT
        s."storeId"                                                          AS store_id,
        MAX(st."name")                                                       AS store_name,
        COUNT(DISTINCT s."goodId")::bigint                                   AS sku_count,
        COALESCE(SUM(s."qtty"), 0)                                           AS total_qtty,
        COALESCE(SUM(CASE WHEN s."qtty" > 0 THEN s."qtty" * COALESCE(g."priceIn", 0) END), 0)  AS value_cost,
        COALESCE(SUM(CASE WHEN s."qtty" > 0 THEN s."qtty" * COALESCE(g."priceOut", 0) END), 0) AS value_sale
      FROM mirror_store_stock s
      LEFT JOIN mirror_goods g
        ON g."tenantId" = s."tenantId"
       AND g."dataSourceId" = s."dataSourceId"
       AND g."externalId" = s."goodId"
      LEFT JOIN mirror_stores st
        ON st."tenantId" = s."tenantId"
       AND st."dataSourceId" = s."dataSourceId"
       AND st."externalId" = s."storeId"
      WHERE s."tenantId" = ${tenantId}
        AND s."dataSourceId" = ${dataSourceId}
      GROUP BY s."storeId"
      ORDER BY value_cost DESC
    `;

    const [aggRows, perStoreRows] = await Promise.all([
      this.prisma.$queryRaw<SummaryRow[]>(aggSql),
      this.prisma.$queryRaw<SummaryStoreRow[]>(perStoreSql),
    ]);

    const agg = aggRows[0];
    const totalCost = toNum(agg?.total_value_cost);
    const totalSale = toNum(agg?.total_value_sale);
    const marginAmount = totalSale - totalCost;
    const marginPct = totalSale > 0 ? (marginAmount / totalSale) * 100 : 0;

    return {
      totalSkus: Number(agg?.total_skus ?? 0),
      positiveSkus: Number(agg?.positive_skus ?? 0),
      zeroSkus: Number(agg?.zero_skus ?? 0),
      negativeSkus: Number(agg?.negative_skus ?? 0),
      totalQtty: toNum(agg?.total_qtty),
      totalValueCost: totalCost,
      totalValueSale: totalSale,
      potentialMarginAmount: marginAmount,
      potentialMarginPct: marginPct,
      stores: perStoreRows.map((r) => ({
        storeId: r.store_id,
        storeName: r.store_name,
        skuCount: Number(r.sku_count),
        totalQtty: toNum(r.total_qtty),
        valueCost: toNum(r.value_cost),
        valueSale: toNum(r.value_sale),
      })),
    };
  }

  // -------------------------------------------------------------------------
  // GROUPS BREAKDOWN
  // -------------------------------------------------------------------------

  async groups(
    tenantId: string,
    sourceIdOverride?: string,
    storeId?: number,
  ): Promise<StockGroupsResponse> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);

    const storeFilter = storeId !== undefined
      ? Prisma.sql`AND s."storeId" = ${storeId}`
      : Prisma.empty;

    const sql = Prisma.sql`
      WITH per_good AS (
        SELECT
          s."goodId"                                            AS good_id,
          SUM(s."qtty")                                         AS qtty,
          COALESCE(MAX(g."priceIn"), 0)                         AS price_in,
          COALESCE(MAX(g."priceOut"), 0)                        AS price_out,
          MAX(g."groupId")                                      AS group_id
        FROM mirror_store_stock s
        LEFT JOIN mirror_goods g
          ON g."tenantId" = s."tenantId"
         AND g."dataSourceId" = s."dataSourceId"
         AND g."externalId" = s."goodId"
        WHERE s."tenantId" = ${tenantId}
          AND s."dataSourceId" = ${dataSourceId}
          ${storeFilter}
        GROUP BY s."goodId"
      )
      SELECT
        pg.group_id                                                          AS group_id,
        gg."name"                                                            AS group_name,
        COUNT(*)::bigint                                                     AS sku_count,
        COALESCE(SUM(pg.qtty), 0)                                            AS total_qtty,
        COALESCE(SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * pg.price_in END), 0)  AS value_cost,
        COALESCE(SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * pg.price_out END), 0) AS value_sale,
        COALESCE(SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * (pg.price_out - pg.price_in) END), 0) AS margin_amount,
        CASE
          WHEN SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * pg.price_out END) > 0
          THEN (SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * (pg.price_out - pg.price_in) END)
                / SUM(CASE WHEN pg.qtty > 0 THEN pg.qtty * pg.price_out END)) * 100
          ELSE 0
        END                                                                  AS margin_pct
      FROM per_good pg
      LEFT JOIN mirror_goods_groups gg
        ON gg."tenantId" = ${tenantId}
       AND gg."dataSourceId" = ${dataSourceId}
       AND gg."externalId" = pg.group_id
      GROUP BY pg.group_id, gg."name"
      ORDER BY value_cost DESC NULLS LAST
    `;

    const rows = await this.prisma.$queryRaw<GroupRow[]>(sql);

    return {
      rows: rows.map((r) => ({
        groupId: r.group_id,
        groupName: r.group_name,
        skuCount: Number(r.sku_count),
        totalQtty: toNum(r.total_qtty),
        valueCost: toNum(r.value_cost),
        valueSale: toNum(r.value_sale),
        marginAmount: toNum(r.margin_amount),
        marginPct: toNum(r.margin_pct),
      })),
    };
  }

  // -------------------------------------------------------------------------
  // LIST (search + filter + paged)
  // -------------------------------------------------------------------------

  async list(
    tenantId: string,
    sourceIdOverride: string | undefined,
    q: StockListQuery,
  ): Promise<StockListResponse> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 25));
    const offset = (page - 1) * pageSize;
    const presence = q.presence ?? 'all';
    const sort = q.sort ?? 'valueCost';
    const order = q.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const stockFilters: Prisma.Sql[] = [
      Prisma.sql`s."tenantId" = ${tenantId}`,
      Prisma.sql`s."dataSourceId" = ${dataSourceId}`,
    ];
    if (q.storeId !== undefined && q.storeId !== null) {
      stockFilters.push(Prisma.sql`s."storeId" = ${q.storeId}`);
    }
    const stockWhere = Prisma.sql`WHERE ${Prisma.join(stockFilters, ' AND ')}`;

    const goodFilters: Prisma.Sql[] = [];
    if (q.groupId !== undefined && q.groupId !== null) {
      goodFilters.push(Prisma.sql`group_id = ${q.groupId}`);
    }
    if (q.search && q.search.trim()) {
      const term = `%${q.search.trim().toLowerCase()}%`;
      goodFilters.push(Prisma.sql`(
        LOWER(COALESCE(good_name, '')) LIKE ${term}
        OR LOWER(COALESCE(good_code, '')) LIKE ${term}
      )`);
    }
    switch (presence) {
      case 'in':
        goodFilters.push(Prisma.sql`total_qtty > 0`);
        break;
      case 'out':
        goodFilters.push(Prisma.sql`total_qtty <= 0`);
        break;
      case 'negative':
        goodFilters.push(Prisma.sql`total_qtty < 0`);
        break;
      default:
        break;
    }
    const goodWhere = goodFilters.length
      ? Prisma.sql`WHERE ${Prisma.join(goodFilters, ' AND ')}`
      : Prisma.empty;

    const orderExpr = (() => {
      switch (sort) {
        case 'name':
          return Prisma.sql`good_name`;
        case 'qtty':
          return Prisma.sql`total_qtty`;
        case 'valueSale':
          return Prisma.sql`value_sale`;
        case 'margin':
          return Prisma.sql`margin_amount`;
        case 'lastSaleAt':
          return Prisma.sql`last_sale_at`;
        case 'valueCost':
        default:
          return Prisma.sql`value_cost`;
      }
    })();

    const saleP = saleDocPredicateSql('d');

    // Внутрішня агрегація — без last_sale_at (його дотягуємо окремим запитом
    // для повернених good_ids, щоб не робити корельовану підзапит по всіх SKU).
    const enrichedCte = Prisma.sql`
      WITH per_good AS (
        SELECT
          s."goodId"                                  AS good_id,
          SUM(s."qtty")                               AS total_qtty,
          MAX(g."code")                               AS good_code,
          MAX(COALESCE(g."nameFull", g."name"))       AS good_name,
          MAX(g."groupId")                            AS group_id,
          MAX(g."unitType")                           AS unit,
          MAX(COALESCE(g."priceIn", 0))               AS price_in,
          MAX(COALESCE(g."priceOut", 0))              AS price_out
        FROM mirror_store_stock s
        LEFT JOIN mirror_goods g
          ON g."tenantId" = s."tenantId"
         AND g."dataSourceId" = s."dataSourceId"
         AND g."externalId" = s."goodId"
        ${stockWhere}
        GROUP BY s."goodId"
      ),
      enriched AS (
        SELECT
          pg.good_id,
          pg.good_code,
          pg.good_name,
          pg.group_id,
          gg."name"                                                 AS group_name,
          pg.unit,
          pg.price_in,
          pg.price_out,
          pg.total_qtty,
          CASE WHEN pg.total_qtty > 0 THEN pg.total_qtty * pg.price_in ELSE 0 END  AS value_cost,
          CASE WHEN pg.total_qtty > 0 THEN pg.total_qtty * pg.price_out ELSE 0 END AS value_sale,
          CASE WHEN pg.total_qtty > 0 THEN pg.total_qtty * (pg.price_out - pg.price_in) ELSE 0 END AS margin_amount,
          CASE
            WHEN pg.total_qtty > 0 AND pg.price_out > 0
            THEN ((pg.price_out - pg.price_in) / pg.price_out) * 100
            ELSE 0
          END                                                       AS margin_pct
        FROM per_good pg
        LEFT JOIN mirror_goods_groups gg
          ON gg."tenantId" = ${tenantId}
         AND gg."dataSourceId" = ${dataSourceId}
         AND gg."externalId" = pg.group_id
      )
    `;

    const countSql = Prisma.sql`
      ${enrichedCte}
      SELECT COUNT(*)::bigint AS c FROM enriched ${goodWhere}
    `;
    const rowsSql = Prisma.sql`
      ${enrichedCte}
      SELECT *, NULL::timestamp AS last_sale_at FROM enriched
      ${goodWhere}
      ORDER BY ${orderExpr} ${order} NULLS LAST, good_name ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ c: bigint }>>(countSql),
      this.prisma.$queryRaw<ListRow[]>(rowsSql),
    ]);

    const total = Number(countRows[0]?.c ?? 0);
    const goodIds = rows.map((r) => r.good_id);

    // Last sale per good — окремим запитом тільки для повернутих good_ids.
    const lastSaleByGood = new Map<number, Date>();
    if (goodIds.length) {
      const goodIdsBig = goodIds.map((id) => BigInt(id));
      const lastSaleSql = Prisma.sql`
        SELECT i."externalGoodId"::bigint AS good_id, MAX(d."dateTime") AS last_sale_at
        FROM mirror_document_items i
        JOIN mirror_documents d
          ON d."tenantId" = i."tenantId"
         AND d."dataSourceId" = i."dataSourceId"
         AND d."externalId" = i."externalDocId"
        WHERE i."tenantId" = ${tenantId}
          AND i."dataSourceId" = ${dataSourceId}
          AND i."externalGoodId" IN (${Prisma.join(goodIdsBig)})
          AND ${saleP}
        GROUP BY i."externalGoodId"
      `;
      const lsRows = await this.prisma.$queryRaw<Array<{ good_id: bigint; last_sale_at: Date | null }>>(lastSaleSql);
      for (const r of lsRows) {
        if (r.last_sale_at) lastSaleByGood.set(Number(r.good_id), r.last_sale_at);
      }
    }
    for (const r of rows) {
      const ls = lastSaleByGood.get(r.good_id);
      r.last_sale_at = ls ?? null;
    }

    let storeRows: StoreRow[] = [];
    if (goodIds.length) {
      const storeSql = Prisma.sql`
        SELECT
          s."goodId"   AS good_id,
          s."storeId"  AS store_id,
          st."name"    AS store_name,
          SUM(s."qtty") AS qtty
        FROM mirror_store_stock s
        LEFT JOIN mirror_stores st
          ON st."tenantId" = s."tenantId"
         AND st."dataSourceId" = s."dataSourceId"
         AND st."externalId" = s."storeId"
        WHERE s."tenantId" = ${tenantId}
          AND s."dataSourceId" = ${dataSourceId}
          AND s."goodId" IN (${Prisma.join(goodIds)})
        GROUP BY s."goodId", s."storeId", st."name"
        ORDER BY s."goodId", st."name"
      `;
      storeRows = await this.prisma.$queryRaw<StoreRow[]>(storeSql);
    }

    const byGood = new Map<number, StockStoreRowDto[]>();
    for (const sr of storeRows) {
      const arr = byGood.get(sr.good_id) ?? [];
      arr.push({
        storeId: sr.store_id,
        storeName: sr.store_name,
        qtty: toNum(sr.qtty),
      });
      byGood.set(sr.good_id, arr);
    }

    const items: StockItemDto[] = rows.map((r) => ({
      goodId: r.good_id,
      goodCode: r.good_code,
      goodName: r.good_name ?? '',
      groupId: r.group_id,
      groupName: r.group_name,
      unit: r.unit,
      priceIn: toNum(r.price_in),
      priceOut: toNum(r.price_out),
      totalQtty: toNum(r.total_qtty),
      valueCost: toNum(r.value_cost),
      valueSale: toNum(r.value_sale),
      marginAmount: toNum(r.margin_amount),
      marginPct: toNum(r.margin_pct),
      lastSaleAt: r.last_sale_at?.toISOString() ?? null,
      stores: byGood.get(r.good_id) ?? [],
    }));

    return { rows: items, total, page, pageSize };
  }

  // -------------------------------------------------------------------------
  // ANALYTICS — top-by-value, dead stock, shortage
  // -------------------------------------------------------------------------

  async analytics(
    tenantId: string,
    sourceIdOverride: string | undefined,
    q: StockAnalyticsQuery,
  ): Promise<StockAnalyticsResponse> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const windowDays = Math.max(1, Math.min(365, q.windowDays ?? 90));
    const limit = Math.max(1, Math.min(100, q.limit ?? 20));
    const saleP = saleDocPredicateSql('d');

    const topSql = Prisma.sql`
      SELECT
        s."goodId"                                                            AS good_id,
        MAX(COALESCE(g."nameFull", g."name"))                                 AS good_name,
        MAX(gg."name")                                                        AS group_name,
        SUM(s."qtty")                                                         AS total_qtty,
        SUM(CASE WHEN s."qtty" > 0 THEN s."qtty" * COALESCE(g."priceIn", 0) END)  AS value_cost,
        SUM(CASE WHEN s."qtty" > 0 THEN s."qtty" * COALESCE(g."priceOut", 0) END) AS value_sale
      FROM mirror_store_stock s
      LEFT JOIN mirror_goods g
        ON g."tenantId" = s."tenantId"
       AND g."dataSourceId" = s."dataSourceId"
       AND g."externalId" = s."goodId"
      LEFT JOIN mirror_goods_groups gg
        ON gg."tenantId" = s."tenantId"
       AND gg."dataSourceId" = s."dataSourceId"
       AND gg."externalId" = g."groupId"
      WHERE s."tenantId" = ${tenantId}
        AND s."dataSourceId" = ${dataSourceId}
      GROUP BY s."goodId"
      HAVING SUM(s."qtty") > 0
      ORDER BY value_cost DESC NULLS LAST
      LIMIT ${limit}
    `;

    const deadSql = Prisma.sql`
      WITH per_good AS (
        SELECT
          s."goodId"                                                          AS good_id,
          SUM(s."qtty")                                                       AS total_qtty,
          COALESCE(MAX(g."priceIn"), 0)                                       AS price_in,
          MAX(COALESCE(g."nameFull", g."name"))                               AS good_name,
          MAX(gg."name")                                                      AS group_name
        FROM mirror_store_stock s
        LEFT JOIN mirror_goods g
          ON g."tenantId" = s."tenantId"
         AND g."dataSourceId" = s."dataSourceId"
         AND g."externalId" = s."goodId"
        LEFT JOIN mirror_goods_groups gg
          ON gg."tenantId" = s."tenantId"
         AND gg."dataSourceId" = s."dataSourceId"
         AND gg."externalId" = g."groupId"
        WHERE s."tenantId" = ${tenantId}
          AND s."dataSourceId" = ${dataSourceId}
        GROUP BY s."goodId"
      ),
      last_sales AS (
        SELECT
          i."externalGoodId"                                                  AS good_id_big,
          MAX(d."dateTime")                                                   AS last_sale_at
        FROM mirror_document_items i
        JOIN mirror_documents d
          ON d."tenantId" = i."tenantId"
         AND d."dataSourceId" = i."dataSourceId"
         AND d."externalId" = i."externalDocId"
        WHERE i."tenantId" = ${tenantId}
          AND i."dataSourceId" = ${dataSourceId}
          AND ${saleP}
        GROUP BY i."externalGoodId"
      )
      SELECT
        pg.good_id,
        pg.good_name,
        pg.group_name,
        pg.total_qtty,
        pg.total_qtty * pg.price_in                                           AS value_cost,
        ls.last_sale_at,
        CASE
          WHEN ls.last_sale_at IS NULL THEN NULL
          ELSE EXTRACT(EPOCH FROM (NOW() - ls.last_sale_at)) / 86400.0
        END                                                                   AS days_since_sale
      FROM per_good pg
      LEFT JOIN last_sales ls ON ls.good_id_big = pg.good_id::bigint
      WHERE pg.total_qtty > 0
        AND (
          ls.last_sale_at IS NULL
          OR ls.last_sale_at < NOW() - (INTERVAL '1 day' * ${windowDays})
        )
      ORDER BY (pg.total_qtty * pg.price_in) DESC
      LIMIT ${limit}
    `;

    const shortageSql = Prisma.sql`
      WITH per_good AS (
        SELECT
          s."goodId"                                                          AS good_id,
          SUM(s."qtty")                                                       AS total_qtty,
          MAX(COALESCE(g."nameFull", g."name"))                               AS good_name,
          MAX(gg."name")                                                      AS group_name
        FROM mirror_store_stock s
        LEFT JOIN mirror_goods g
          ON g."tenantId" = s."tenantId"
         AND g."dataSourceId" = s."dataSourceId"
         AND g."externalId" = s."goodId"
        LEFT JOIN mirror_goods_groups gg
          ON gg."tenantId" = s."tenantId"
         AND gg."dataSourceId" = s."dataSourceId"
         AND gg."externalId" = g."groupId"
        WHERE s."tenantId" = ${tenantId}
          AND s."dataSourceId" = ${dataSourceId}
        GROUP BY s."goodId"
      ),
      window_sales AS (
        SELECT
          i."externalGoodId"                                                  AS good_id_big,
          SUM(i."qtty")                                                       AS qtty_sold,
          MAX(d."dateTime")                                                   AS last_sale_at
        FROM mirror_document_items i
        JOIN mirror_documents d
          ON d."tenantId" = i."tenantId"
         AND d."dataSourceId" = i."dataSourceId"
         AND d."externalId" = i."externalDocId"
        WHERE i."tenantId" = ${tenantId}
          AND i."dataSourceId" = ${dataSourceId}
          AND ${saleP}
          AND d."dateTime" >= NOW() - (INTERVAL '1 day' * ${windowDays})
        GROUP BY i."externalGoodId"
      )
      SELECT
        pg.good_id,
        pg.good_name,
        pg.group_name,
        pg.total_qtty,
        COALESCE(ws.qtty_sold, 0)                                             AS qtty_sold_window,
        COALESCE(ws.qtty_sold, 0) / ${windowDays}::float                      AS avg_daily_sales,
        CASE
          WHEN COALESCE(ws.qtty_sold, 0) > 0
          THEN pg.total_qtty / (ws.qtty_sold / ${windowDays}::float)
          ELSE NULL
        END                                                                   AS days_of_stock,
        ws.last_sale_at
      FROM per_good pg
      JOIN window_sales ws ON ws.good_id_big = pg.good_id::bigint
      WHERE ws.qtty_sold > 0
      ORDER BY days_of_stock ASC NULLS FIRST, ws.qtty_sold DESC
      LIMIT ${limit}
    `;

    const [topRows, deadRows, shortageRows] = await Promise.all([
      this.prisma.$queryRaw<TopValueRow[]>(topSql),
      this.prisma.$queryRaw<DeadRow[]>(deadSql),
      this.prisma.$queryRaw<ShortageRow[]>(shortageSql),
    ]);

    const topByValue: StockTopValueRowDto[] = topRows.map((r) => ({
      goodId: r.good_id,
      goodName: r.good_name ?? '',
      groupName: r.group_name,
      totalQtty: toNum(r.total_qtty),
      valueCost: toNum(r.value_cost),
      valueSale: toNum(r.value_sale),
    }));

    const deadStock: StockDeadRowDto[] = deadRows.map((r) => ({
      goodId: r.good_id,
      goodName: r.good_name ?? '',
      groupName: r.group_name,
      totalQtty: toNum(r.total_qtty),
      valueCost: toNum(r.value_cost),
      lastSaleAt: r.last_sale_at?.toISOString() ?? null,
      daysSinceSale: r.days_since_sale === null ? null : toNum(r.days_since_sale),
    }));

    const shortage: StockShortageRowDto[] = shortageRows.map((r) => ({
      goodId: r.good_id,
      goodName: r.good_name ?? '',
      groupName: r.group_name,
      totalQtty: toNum(r.total_qtty),
      qttySoldWindow: toNum(r.qtty_sold_window),
      avgDailySales: toNum(r.avg_daily_sales),
      daysOfStock: r.days_of_stock === null ? null : toNum(r.days_of_stock),
      lastSaleAt: r.last_sale_at?.toISOString() ?? null,
    }));

    return { windowDays, topByValue, deadStock, shortage };
  }
}
