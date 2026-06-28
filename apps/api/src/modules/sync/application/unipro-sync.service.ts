/**
 * UniproSyncService — pull-синхронізація з Unipro MSSQL у mirror-таблиці Postgres.
 *
 * MVP-стратегія:
 *  • Довідники (entities/stores/users/partner_groups/partners/goods_groups/goods)
 *    синхронізуються повністю: deleteMany + createMany у одній транзакції.
 *  • Документи (documents/document_items) — incremental по fRV (SQL rowversion):
 *      - якщо cursor.watermarkHex є → WHERE fRV > @hex
 *      - інакше — повне завантаження (для MVP розміри прийнятні: ~16K документів)
 *  • Кожен виклик створює запис SyncJob і оновлює SyncCursor по сутності.
 *
 * Поведінка ізольована від BullMQ — викликається синхронно з HTTP-запиту.
 * Коли з'явиться Redis, додамо чергу і scheduler поверх цього сервісу.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma, SyncEntity, SyncJobStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.module';
import type { MssqlCredentials } from '@unipro-crm/shared-types';
import { CredentialsCipherService } from './credentials-cipher.service';
import { MssqlAdapterService } from '../infrastructure/mssql-adapter.service';
import {
  mapDocument,
  mapDocumentItem,
  mapEntity,
  mapGood,
  mapGoodsGroup,
  mapPartner,
  mapPartnerGroup,
  mapStore,
  mapStoreStock,
  mapUser,
  type MapperCtx,
} from './unipro-mapper';

const DOC_BATCH_SIZE = 500;
const TX_TIMEOUT_MS = 120_000; // bulk-завантаження довідників на Supabase direct connection.
const TX_OPTS = { timeout: TX_TIMEOUT_MS, maxWait: 30_000 } as const;

export interface JobResult {
  jobId: string;
  status: SyncJobStatus;
  recordsRead: number;
  recordsWritten: number;
  durationMs: number;
  errorMessage?: string;
}

@Injectable()
export class UniproSyncService {
  private readonly logger = new Logger(UniproSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: CredentialsCipherService,
    private readonly mssql: MssqlAdapterService,
  ) {}

  /**
   * Запустити синхронізацію однієї логічної сутності.
   * Створює SyncJob, виконує pull+upsert, оновлює SyncCursor, повертає підсумок.
   */
  async runEntitySync(
    tenantId: string,
    dataSourceId: string,
    entity: SyncEntity,
  ): Promise<JobResult> {
    const source = await this.prisma.dataSource.findFirst({
      where: { id: dataSourceId, tenantId },
    });
    if (!source) throw new NotFoundException('Джерело не знайдено');
    if (source.type !== 'UNIPRO_MSSQL') {
      throw new BadRequestException('Синхронізація доступна лише для UNIPRO_MSSQL');
    }
    const creds = this.cipher.decrypt<MssqlCredentials>(source.credentialsCipher);
    const ctx: MapperCtx = { tenantId, dataSourceId };

    const job = await this.prisma.syncJob.create({
      data: {
        tenantId,
        dataSourceId,
        type: 'ENTITY_SYNC',
        status: 'RUNNING',
        entity,
        startedAt: new Date(),
      },
    });
    const t0 = Date.now();
    try {
      const out = await this.dispatch(entity, ctx, creds);
      const finishedAt = new Date();
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS',
          finishedAt,
          recordsRead: out.read,
          recordsWritten: out.written,
          meta: { watermarkHex: out.watermarkHex ?? null } as Prisma.InputJsonValue,
        },
      });
      await this.upsertCursor(tenantId, dataSourceId, entity, {
        recordsTotal: out.written,
        watermarkHex: out.watermarkHex ?? undefined,
        success: true,
      });
      return {
        jobId: job.id,
        status: 'SUCCESS',
        recordsRead: out.read,
        recordsWritten: out.written,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Sync ${entity} failed: ${e.message}`, e.stack);
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: e.message.slice(0, 1000),
        },
      });
      await this.upsertCursor(tenantId, dataSourceId, entity, {
        success: false,
        errorMessage: e.message.slice(0, 1000),
      });
      return {
        jobId: job.id,
        status: 'FAILED',
        recordsRead: 0,
        recordsWritten: 0,
        durationMs: Date.now() - t0,
        errorMessage: e.message,
      };
    }
  }

  /** Послідовно синхронізувати всі довідники + документи. */
  async runFullSync(tenantId: string, dataSourceId: string): Promise<JobResult[]> {
    const order: SyncEntity[] = [
      'ENTITIES',
      'STORES',
      'USERS',
      'PARTNER_GROUPS',
      'PARTNERS',
      'GOODS_GROUPS',
      'GOODS',
      'DOCUMENTS',
      'STORE_STOCK',
    ];
    const results: JobResult[] = [];
    for (const e of order) {
      const r = await this.runEntitySync(tenantId, dataSourceId, e);
      results.push(r);
      if (r.status === 'FAILED') break;
    }
    return results;
  }

  /** Поточний стан синхронізації по сутностях (для UI). */
  async getStatus(tenantId: string, dataSourceId: string) {
    const cursors = await this.prisma.syncCursor.findMany({
      where: { tenantId, dataSourceId },
      orderBy: { entity: 'asc' },
    });
    const counts = await Promise.all([
      this.prisma.mirrorEntity.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorStore.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorUser.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorPartnerGroup.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorPartner.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorGoodsGroup.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorGood.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorDocument.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorDocumentItem.count({ where: { tenantId, dataSourceId } }),
      this.prisma.mirrorStoreStock.count({ where: { tenantId, dataSourceId } }),
    ]);
    const [ent, st, us, pg, pa, gg, gd, doc, di, stk] = counts;
    return {
      cursors: cursors.map((c) => ({
        entity: c.entity,
        recordsTotal: c.recordsTotal,
        watermarkHex: c.watermarkHex,
        watermarkInt: c.watermarkInt != null ? c.watermarkInt.toString() : null,
        lastRunAt: c.lastRunAt?.toISOString() ?? null,
        lastSuccessAt: c.lastSuccessAt?.toISOString() ?? null,
        lastErrorAt: c.lastErrorAt?.toISOString() ?? null,
        lastError: c.lastError,
      })),
      counts: {
        ENTITIES: ent,
        STORES: st,
        USERS: us,
        PARTNER_GROUPS: pg,
        PARTNERS: pa,
        GOODS_GROUPS: gg,
        GOODS: gd,
        DOCUMENTS: doc,
        DOCUMENT_ITEMS: di,
        STORE_STOCK: stk,
      },
    };
  }

  /** Журнал останніх job'ів (для UI). */
  async getJobs(tenantId: string, dataSourceId: string, limit = 30) {
    return this.prisma.syncJob.findMany({
      where: { tenantId, dataSourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // -------------------------------------------------------------------------
  // Dispatch — окрема логіка під кожну сутність
  // -------------------------------------------------------------------------

  private async dispatch(
    entity: SyncEntity,
    ctx: MapperCtx,
    creds: MssqlCredentials,
  ): Promise<{ read: number; written: number; watermarkHex?: string | null }> {
    switch (entity) {
      case 'ENTITIES':
        return this.syncEntities(ctx, creds);
      case 'STORES':
        return this.syncStores(ctx, creds);
      case 'USERS':
        return this.syncUsers(ctx, creds);
      case 'PARTNER_GROUPS':
        return this.syncPartnerGroups(ctx, creds);
      case 'PARTNERS':
        return this.syncPartners(ctx, creds);
      case 'GOODS_GROUPS':
        return this.syncGoodsGroups(ctx, creds);
      case 'GOODS':
        return this.syncGoods(ctx, creds);
      case 'DOCUMENTS':
        return this.syncDocuments(ctx, creds);
      case 'STORE_STOCK':
        return this.syncStoreStock(ctx, creds);
      case 'DOCUMENT_ITEMS':
      case 'PAYMENTS':
        throw new BadRequestException(
          `Сутність ${entity} синхронізується разом з DOCUMENTS, окремо не запускається`,
        );
      default:
        throw new BadRequestException(`Невідома сутність: ${entity as string}`);
    }
  }

  // --- ДОВІДНИКИ -----------------------------------------------------------

  private async syncEntities(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniEntities',
    );
    const mapped = rows.map((r) => mapEntity(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorEntity.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorEntity.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncStores(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniStores',
    );
    const mapped = rows.map((r) => mapStore(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorStore.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorStore.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncUsers(ctx: MapperCtx, creds: MssqlCredentials) {
    // Не вибираємо fPassword/fPassword2 — паролі не потрапляють у мережу.
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      `SELECT fId, fCode, fName, fNamePrint, fState, fGroupID, fCardNumber, fGUID1, fGUID2
       FROM dbo.uniUsers`,
    );
    const mapped = rows.map((r) => mapUser(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorUser.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorUser.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncPartnerGroups(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniPartnersGroups',
    );
    const mapped = rows.map((r) => mapPartnerGroup(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorPartnerGroup.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorPartnerGroup.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncPartners(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniPartners',
    );
    const mapped = rows.map((r) => mapPartner(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorPartner.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorPartner.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncGoodsGroups(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniGoodsGroups',
    );
    const mapped = rows.map((r) => mapGoodsGroup(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorGoodsGroup.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorGoodsGroup.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncGoods(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniGoods',
    );
    const mapped = rows.map((r) => mapGood(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorGood.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) await tx.mirrorGood.createMany({ data: mapped });
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  private async syncStoreStock(ctx: MapperCtx, creds: MssqlCredentials) {
    // uniAStoreNow — невелика таблиця (≈ 13k рядків), повне перезаписування.
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT fId, fEntId, fStoreId, fGoodId, fQtty, fSum FROM dbo.uniAStoreNow',
    );
    const mapped = rows.map((r) => mapStoreStock(ctx, r));
    await this.prisma.$transaction(async (tx) => {
      await tx.mirrorStoreStock.deleteMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
      });
      if (mapped.length) {
        // createMany не любить великі пачки JSON — ділимо по 1000.
        for (let i = 0; i < mapped.length; i += 1000) {
          await tx.mirrorStoreStock.createMany({ data: mapped.slice(i, i + 1000) });
        }
      }
    }, TX_OPTS);
    return { read: rows.length, written: mapped.length };
  }

  // --- ДОКУМЕНТИ (incremental по fRV) --------------------------------------

  private async syncDocuments(ctx: MapperCtx, creds: MssqlCredentials) {
    const cursor = await this.prisma.syncCursor.findUnique({
      where: {
        tenantId_dataSourceId_entity: {
          tenantId: ctx.tenantId,
          dataSourceId: ctx.dataSourceId,
          entity: 'DOCUMENTS',
        },
      },
    });
    const watermarkHex = cursor?.watermarkHex ?? null;

    let totalRead = 0;
    let totalWritten = 0;
    let maxWatermark = watermarkHex;
    let safetyLoops = 0;

    while (safetyLoops < 200) {
      safetyLoops += 1;

      const whereSql = maxWatermark ? `WHERE fRV > CONVERT(rowversion, ${maxWatermark})` : '';
      // TOP @batch ORDER BY fRV ASC — гарантує монотонне просування watermark.
      const docsSql = `
        SELECT TOP ${DOC_BATCH_SIZE} *
        FROM dbo.uniDocuments
        ${whereSql}
        ORDER BY fRV ASC
      `;
      const docRows = await this.mssql.query<Record<string, unknown>>(creds, docsSql);
      if (docRows.length === 0) break;

      const docInputs = docRows.map((r) => mapDocument(ctx, r));
      const docIds = docInputs.map((d) => d.externalId);

      // Витягуємо позиції для цієї партії документів одним запитом.
      const idsList = docIds.map((id) => id.toString()).join(',');
      const itemsSql = `
        SELECT * FROM dbo.uniDocGoods
        WHERE fDocId IN (${idsList})
      `;
      const itemRows = await this.mssql.query<Record<string, unknown>>(creds, itemsSql);
      const itemInputs = itemRows.map((r) => mapDocumentItem(ctx, r));

      // Перерахуємо itemsCount на боці Postgres.
      const countByDoc = new Map<string, number>();
      for (const it of itemInputs) {
        const key = it.externalDocId.toString();
        countByDoc.set(key, (countByDoc.get(key) ?? 0) + 1);
      }
      for (const d of docInputs) {
        d.itemsCount = countByDoc.get(d.externalId.toString()) ?? 0;
      }

      await this.prisma.$transaction(async (tx) => {
        // UPSERT документів через delete+create — простіше для MVP.
        await tx.mirrorDocument.deleteMany({
          where: {
            tenantId: ctx.tenantId,
            dataSourceId: ctx.dataSourceId,
            externalId: { in: docIds },
          },
        });
        await tx.mirrorDocument.createMany({ data: docInputs });
        // Позиції — видаляємо за externalDocId і вставляємо заново.
        await tx.mirrorDocumentItem.deleteMany({
          where: {
            tenantId: ctx.tenantId,
            dataSourceId: ctx.dataSourceId,
            externalDocId: { in: docIds },
          },
        });
        if (itemInputs.length) {
          await tx.mirrorDocumentItem.createMany({ data: itemInputs });
        }
      }, TX_OPTS);

      totalRead += docRows.length;
      totalWritten += docInputs.length;
      // Останній rvHex у партії — нова watermark.
      const lastRv = docInputs[docInputs.length - 1]?.rvHex;
      if (lastRv && lastRv !== maxWatermark) {
        maxWatermark = lastRv;
      } else {
        // Захист від нескінченного циклу: rowversion унікальний.
        this.logger.warn('syncDocuments: watermark не змінився, виходимо');
        break;
      }
      if (docRows.length < DOC_BATCH_SIZE) break;
    }

    return { read: totalRead, written: totalWritten, watermarkHex: maxWatermark };
  }

  // -------------------------------------------------------------------------

  private async upsertCursor(
    tenantId: string,
    dataSourceId: string,
    entity: SyncEntity,
    upd: {
      recordsTotal?: number;
      watermarkHex?: string | null;
      success: boolean;
      errorMessage?: string;
    },
  ) {
    const now = new Date();
    const data: Prisma.SyncCursorUpsertArgs['update'] = {
      lastRunAt: now,
      ...(upd.success
        ? { lastSuccessAt: now, lastError: null, lastErrorAt: null }
        : { lastErrorAt: now, lastError: upd.errorMessage ?? 'unknown' }),
      ...(upd.recordsTotal !== undefined ? { recordsTotal: upd.recordsTotal } : {}),
      ...(upd.watermarkHex !== undefined ? { watermarkHex: upd.watermarkHex } : {}),
    };
    const create: Prisma.SyncCursorUncheckedCreateInput = {
      tenantId,
      dataSourceId,
      entity,
      lastRunAt: now,
      lastSuccessAt: upd.success ? now : null,
      lastErrorAt: upd.success ? null : now,
      lastError: upd.success ? null : (upd.errorMessage ?? 'unknown'),
      recordsTotal: upd.recordsTotal ?? 0,
      watermarkHex: upd.watermarkHex ?? null,
    };
    await this.prisma.syncCursor.upsert({
      where: {
        tenantId_dataSourceId_entity: { tenantId, dataSourceId, entity },
      },
      create,
      update: data,
    });
  }
}
