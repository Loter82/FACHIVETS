import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CustomerListItemDto,
  CustomerListQuery,
  CustomerListResponse,
  CustomerOrderDto,
  CustomerOrdersResponse,
  CustomerProfileDto,
  CustomerSort,
  CustomerStatsDto,
} from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import { DataSourceResolverService } from '../../shared/data-source-resolver.service';
import { docTypeLabel } from '../../shared/unipro/doc-types';
import {
  returnDocPredicateSql,
  saleDocPredicateSql,
} from '../../shared/unipro/doc-sql';

interface AggRow {
  partner_id: number;
  orders_count: bigint;
  sales_sum: number | string | null;
  returns_sum: number | string | null;
  first_at: Date | null;
  last_at: Date | null;
  unique_stores: bigint;
}

interface ListRow {
  id: string;
  external_id: number;
  code: string | null;
  display_name: string | null;
  card_number: string | null;
  group_id: number | null;
  group_name: string | null;
  phones: unknown;
  orders_count: bigint | null;
  sales_sum: number | string | null;
  returns_sum: number | string | null;
  first_at: Date | null;
  last_at: Date | null;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DataSourceResolverService,
  ) {}

  async list(
    tenantId: string,
    sourceIdOverride: string | undefined,
    q: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const isSale = saleDocPredicateSql('d');
    const isReturn = returnDocPredicateSql('d');

    const filters: Prisma.Sql[] = [
      Prisma.sql`p."tenantId" = ${tenantId}`,
      Prisma.sql`p."dataSourceId" = ${dataSourceId}`,
    ];
    if (q.groupId !== undefined && q.groupId !== null) {
      filters.push(Prisma.sql`p."groupId" = ${q.groupId}`);
    }
    if (q.search && q.search.trim()) {
      const term = `%${q.search.trim()}%`;
      filters.push(
        Prisma.sql`(p."displayName" ILIKE ${term} OR p.code ILIKE ${term} OR p."cardNumber" ILIKE ${term} OR p."namePrint" ILIKE ${term} OR p.phones::text ILIKE ${term})`,
      );
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
    const orderBy = this.buildOrderBy(q.sort, q.order);
    const havingSql = q.hasPurchases
      ? Prisma.sql`WHERE sales_sum > 0`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ListRow[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          p.id AS partner_pk,
          COUNT(d.id) FILTER (WHERE ${isSale}) AS orders_count,
          COALESCE(SUM(d."docSum") FILTER (WHERE ${isSale}), 0) AS sales_sum,
          COALESCE(SUM(d."docSum") FILTER (WHERE ${isReturn}), 0) AS returns_sum,
          MIN(d."dateTime") FILTER (WHERE ${isSale}) AS first_at,
          MAX(d."dateTime") FILTER (WHERE ${isSale}) AS last_at
        FROM mirror_partners p
        LEFT JOIN mirror_documents d
          ON d."tenantId" = p."tenantId"
          AND d."dataSourceId" = p."dataSourceId"
          AND d."partnerId" = p."externalId"
        ${whereSql}
        GROUP BY p.id
      )
      SELECT
        p.id,
        p."externalId" AS external_id,
        p.code,
        p."displayName" AS display_name,
        p."cardNumber" AS card_number,
        p."groupId" AS group_id,
        g.name AS group_name,
        p.phones,
        a.orders_count,
        a.sales_sum,
        a.returns_sum,
        a.first_at,
        a.last_at
      FROM agg a
      JOIN mirror_partners p ON p.id = a.partner_pk
      LEFT JOIN mirror_partner_groups g
        ON g."tenantId" = p."tenantId"
        AND g."dataSourceId" = p."dataSourceId"
        AND g."externalId" = p."groupId"
      ${havingSql}
      ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const totalRows = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          p.id AS partner_pk,
          COALESCE(SUM(d."docSum") FILTER (WHERE ${isSale}), 0) AS sales_sum
        FROM mirror_partners p
        LEFT JOIN mirror_documents d
          ON d."tenantId" = p."tenantId"
          AND d."dataSourceId" = p."dataSourceId"
          AND d."partnerId" = p."externalId"
        ${whereSql}
        GROUP BY p.id
      )
      SELECT COUNT(*)::bigint AS total FROM agg ${havingSql}
    `);
    const total = Number(totalRows[0]?.total ?? 0);

    const items: CustomerListItemDto[] = rows.map((r) => this.mapListRow(r));

    return { items, total, page, pageSize };
  }

  async profile(
    tenantId: string,
    sourceIdOverride: string | undefined,
    customerId: string,
  ): Promise<CustomerProfileDto> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const partner = await this.prisma.mirrorPartner.findFirst({
      where: { id: customerId, tenantId, dataSourceId },
    });
    if (!partner) throw new NotFoundException('Клієнта не знайдено');

    let groupName: string | null = null;
    if (partner.groupId !== null && partner.groupId !== undefined) {
      const group = await this.prisma.mirrorPartnerGroup.findFirst({
        where: {
          tenantId,
          dataSourceId,
          externalId: partner.groupId,
        },
        select: { name: true },
      });
      groupName = group?.name ?? null;
    }

    const stats = await this.computeStats(tenantId, dataSourceId, partner.externalId);

    return {
      id: partner.id,
      externalId: partner.externalId,
      code: partner.code,
      displayName: partner.displayName ?? partner.name ?? partner.code ?? '(без імені)',
      namePrint: partner.namePrint,
      cardNumber: partner.cardNumber,
      groupId: partner.groupId,
      groupName,
      phones: (partner.phones as string[]) ?? [],
      addresses: (partner.addresses as string[]) ?? [],
      dates: (partner.dates as string[]) ?? [],
      edrpou: partner.edrpou,
      inn: partner.inn,
      description: partner.description,
      state: partner.state,
      syncedAt: partner.syncedAt.toISOString(),
      stats,
    };
  }

  async orders(
    tenantId: string,
    sourceIdOverride: string | undefined,
    customerId: string,
    page = 1,
    pageSize = 25,
  ): Promise<CustomerOrdersResponse> {
    const dataSourceId = await this.resolver.resolve(tenantId, sourceIdOverride);
    const partner = await this.prisma.mirrorPartner.findFirst({
      where: { id: customerId, tenantId, dataSourceId },
      select: { externalId: true },
    });
    if (!partner) throw new NotFoundException('Клієнта не знайдено');

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(200, Math.max(1, pageSize));
    const skip = (safePage - 1) * safePageSize;

    const [docs, total, stores] = await Promise.all([
      this.prisma.mirrorDocument.findMany({
        where: {
          tenantId,
          dataSourceId,
          partnerId: partner.externalId,
        },
        orderBy: { dateTime: 'desc' },
        take: safePageSize,
        skip,
      }),
      this.prisma.mirrorDocument.count({
        where: {
          tenantId,
          dataSourceId,
          partnerId: partner.externalId,
        },
      }),
      this.prisma.mirrorStore.findMany({
        where: { tenantId, dataSourceId },
        select: { externalId: true, name: true },
      }),
    ]);

    const storeMap = new Map<number, string | null>(
      stores.map((s) => [s.externalId, s.name]),
    );

    const items: CustomerOrderDto[] = docs.map((d) => ({
      id: d.id,
      externalId: d.externalId.toString(),
      docNum: d.docNum?.toString() ?? null,
      docType: d.docType,
      docTypeLabel: docTypeLabel(d.docType),
      dateTime: d.dateTime.toISOString(),
      docSum: d.docSum ?? 0,
      storeId: d.storeId,
      storeName: d.storeId !== null && d.storeId !== undefined ? storeMap.get(d.storeId) ?? null : null,
      itemsCount: d.itemsCount,
      description: d.description,
    }));

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  private async computeStats(
    tenantId: string,
    dataSourceId: string,
    externalId: number,
  ): Promise<CustomerStatsDto> {
    const isSale = saleDocPredicateSql('');
    const isReturn = returnDocPredicateSql('');

    const rows = await this.prisma.$queryRaw<AggRow[]>(Prisma.sql`
      SELECT
        ${externalId}::int AS partner_id,
        COUNT(*) FILTER (WHERE ${isSale}) AS orders_count,
        COALESCE(SUM("docSum") FILTER (WHERE ${isSale}), 0) AS sales_sum,
        COALESCE(SUM("docSum") FILTER (WHERE ${isReturn}), 0) AS returns_sum,
        MIN("dateTime") FILTER (WHERE ${isSale}) AS first_at,
        MAX("dateTime") FILTER (WHERE ${isSale}) AS last_at,
        COUNT(DISTINCT "storeId") FILTER (WHERE ${isSale}) AS unique_stores
      FROM mirror_documents
      WHERE "tenantId" = ${tenantId}
        AND "dataSourceId" = ${dataSourceId}
        AND "partnerId" = ${externalId}
    `);
    const r = rows[0];
    const ordersCount = Number(r?.orders_count ?? 0);
    const salesSum = Number(r?.sales_sum ?? 0);
    const returnsSum = Number(r?.returns_sum ?? 0);
    const netRevenue = salesSum - returnsSum;
    const avgOrderValue = ordersCount > 0 ? salesSum / ordersCount : 0;
    const firstAt = r?.first_at ?? null;
    const lastAt = r?.last_at ?? null;
    const daysSinceLastPurchase =
      lastAt ? Math.max(0, Math.floor((Date.now() - lastAt.getTime()) / 86_400_000)) : null;

    return {
      ordersCount,
      salesSum,
      returnsSum,
      netRevenue,
      avgOrderValue,
      firstPurchaseAt: firstAt ? firstAt.toISOString() : null,
      lastPurchaseAt: lastAt ? lastAt.toISOString() : null,
      daysSinceLastPurchase,
      uniqueStores: Number(r?.unique_stores ?? 0),
    };
  }

  private mapListRow(r: ListRow): CustomerListItemDto {
    const ordersCount = Number(r.orders_count ?? 0);
    const salesSum = Number(r.sales_sum ?? 0);
    const returnsSum = Number(r.returns_sum ?? 0);
    const netRevenue = salesSum - returnsSum;
    const avgOrderValue = ordersCount > 0 ? salesSum / ordersCount : 0;
    return {
      id: r.id,
      externalId: r.external_id,
      code: r.code,
      displayName: r.display_name ?? r.code ?? '(без імені)',
      cardNumber: r.card_number,
      groupId: r.group_id,
      groupName: r.group_name,
      phones: Array.isArray(r.phones) ? (r.phones as string[]) : [],
      ordersCount,
      salesSum,
      returnsSum,
      netRevenue,
      avgOrderValue,
      firstPurchaseAt: r.first_at ? r.first_at.toISOString() : null,
      lastPurchaseAt: r.last_at ? r.last_at.toISOString() : null,
    };
  }

  private buildOrderBy(sort?: CustomerSort, order?: 'asc' | 'desc'): Prisma.Sql {
    const dir = order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    switch (sort) {
      case 'name':
        return Prisma.sql`ORDER BY LOWER(p."displayName") ${order === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}, p.id ASC`;
      case 'firstPurchase':
        return Prisma.sql`ORDER BY first_at ${dir} NULLS LAST, p.id ASC`;
      case 'ordersCount':
        return Prisma.sql`ORDER BY orders_count ${dir} NULLS LAST, p.id ASC`;
      case 'revenue':
        return Prisma.sql`ORDER BY (sales_sum - returns_sum) ${dir} NULLS LAST, p.id ASC`;
      case 'lastPurchase':
      default:
        return Prisma.sql`ORDER BY last_at ${dir} NULLS LAST, p.id ASC`;
    }
  }
}
