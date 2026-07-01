/**
 * UniproSyncService — pull-синхронізація з Unipro MSSQL у mirror-таблиці Postgres.
 *
 * Стратегії:
 *  • Довідники (entities/stores/users/partner_groups/partners/goods_groups/goods/store_stock)
 *    синхронізуються через HASH_DIFF: тягнемо повний перелік з MSSQL, рахуємо SHA-1 hash
 *    кожного рядка, порівнюємо з існуючим rowHash у Postgres і пишемо лише різницю
 *    (insert нових, update змінених, delete видалених). Постгресові записи —
 *    основний cost driver (Supabase), тому це головний оптимізатор.
 *  • Документи (uniDocuments/uniDocGoods) — ROWVERSION: WHERE fRV > watermark ORDER BY fRV.
 *  • Кожен виклик створює запис SyncJob і оновлює SyncCursor по сутності.
 *
 * Виклик — синхронний з HTTP-запиту або з BullMQ-воркера (див. SyncSchedulerService).
 */

import { createHash } from 'crypto';
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
const REF_WRITE_BATCH_SIZE = 1000;
const TX_TIMEOUT_MS = 120_000; // bulk-завантаження довідників на Supabase direct connection.
const TX_OPTS = { timeout: TX_TIMEOUT_MS, maxWait: 30_000 } as const;

/** Стратегії, які видно у SyncCursor.strategy і в результаті job. */
export type SyncStrategy = 'HASH_DIFF' | 'ROWVERSION' | 'FULL';

/** Модельні ключі Prisma для mirror-таблиць, що підтримують hash-diff. */
type MirrorRefModel =
  | 'mirrorEntity'
  | 'mirrorStore'
  | 'mirrorUser'
  | 'mirrorPartnerGroup'
  | 'mirrorPartner'
  | 'mirrorGoodsGroup'
  | 'mirrorGood'
  | 'mirrorStoreStock';

export interface JobResult {
  jobId: string;
  status: SyncJobStatus;
  recordsRead: number;
  recordsWritten: number;
  durationMs: number;
  strategy?: SyncStrategy;
  errorMessage?: string;
}

/** SHA-1 стабільного JSON — служить як rowHash. */
function hashPayload(payload: unknown): string {
  const h = createHash('sha1');
  h.update(stableStringify(payload));
  return h.digest('hex');
}

/** Стабільна серіалізація: сортує ключі об'єктів, BigInt → string. */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'bigint') return `"${value.toString()}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const parts = keys.map(
      (k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]),
    );
    return '{' + parts.join(',') + '}';
  }
  return JSON.stringify(String(value));
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
          meta: {
            watermarkHex: out.watermarkHex ?? null,
            strategy: out.strategy ?? null,
          } as Prisma.InputJsonValue,
        },
      });
      await this.upsertCursor(tenantId, dataSourceId, entity, {
        recordsTotal: out.written,
        watermarkHex: out.watermarkHex ?? undefined,
        strategy: out.strategy,
        success: true,
      });
      return {
        jobId: job.id,
        status: 'SUCCESS',
        recordsRead: out.read,
        recordsWritten: out.written,
        durationMs: Date.now() - t0,
        strategy: out.strategy,
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
        strategy: c.strategy,
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
  ): Promise<{ read: number; written: number; watermarkHex?: string | null; strategy: SyncStrategy }> {
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

  // -------------------------------------------------------------------------
  // Hash-diff helper: спільна логіка для всіх reference-таблиць.
  // Тягнемо все з MSSQL, рахуємо hash, порівнюємо з існуючими rowHash — пишемо різницю.
  // -------------------------------------------------------------------------

  /**
   * @param modelKey — камелкейс-ключ моделі Prisma (наприклад 'mirrorPartner').
   * @param mapped — уже змапені рядки. Кожен ОБОВ'ЯЗКОВО містить `externalId` і `payload`.
   *   Поле `rowHash` буде обчислене автоматично з `payload`.
   */
  private async runHashDiff<
    T extends { externalId: number | bigint; payload: unknown },
  >(
    ctx: MapperCtx,
    modelKey: MirrorRefModel,
    mapped: T[],
  ): Promise<{ read: number; written: number; strategy: SyncStrategy }> {
    // 1. Обчислити хеш для кожного змапеного рядка.
    for (const m of mapped) {
      (m as unknown as { rowHash?: string }).rowHash = hashPayload(m.payload);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const delegate = (this.prisma as any)[modelKey];
    const existing: Array<{ externalId: number | bigint; rowHash: string | null }> =
      await delegate.findMany({
        where: { tenantId: ctx.tenantId, dataSourceId: ctx.dataSourceId },
        select: { externalId: true, rowHash: true },
      });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const existingMap = new Map<string, string | null>();
    for (const e of existing) existingMap.set(String(e.externalId), e.rowHash);

    const seenIds = new Set<string>();
    const toWrite: T[] = [];
    for (const m of mapped) {
      const key = String(m.externalId);
      seenIds.add(key);
      const oldHash = existingMap.get(key);
      if (oldHash === undefined) {
        toWrite.push(m); // new
      } else if (oldHash !== (m as unknown as { rowHash?: string }).rowHash) {
        toWrite.push(m); // changed
      }
    }
    const toDeleteIds: Array<number | bigint> = [];
    for (const e of existing) {
      if (!seenIds.has(String(e.externalId))) toDeleteIds.push(e.externalId);
    }
    const toWriteIds = toWrite.map((w) => w.externalId);

    if (toDeleteIds.length === 0 && toWriteIds.length === 0) {
      this.logger.debug(`hash-diff ${modelKey}: no changes (${mapped.length} rows)`);
      return { read: mapped.length, written: 0, strategy: 'HASH_DIFF' };
    }

    await this.prisma.$transaction(async (tx) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const txDelegate = (tx as any)[modelKey];
      if (toDeleteIds.length) {
        await txDelegate.deleteMany({
          where: {
            tenantId: ctx.tenantId,
            dataSourceId: ctx.dataSourceId,
            externalId: { in: toDeleteIds },
          },
        });
      }
      if (toWrite.length) {
        // Delete-and-insert для змінених + нові разом
        await txDelegate.deleteMany({
          where: {
            tenantId: ctx.tenantId,
            dataSourceId: ctx.dataSourceId,
            externalId: { in: toWriteIds },
          },
        });
        for (let i = 0; i < toWrite.length; i += REF_WRITE_BATCH_SIZE) {
          await txDelegate.createMany({
            data: toWrite.slice(i, i + REF_WRITE_BATCH_SIZE),
          });
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }, TX_OPTS);

    this.logger.debug(
      `hash-diff ${modelKey}: read=${mapped.length} write=${toWrite.length} delete=${toDeleteIds.length}`,
    );
    return {
      read: mapped.length,
      written: toWrite.length + toDeleteIds.length,
      strategy: 'HASH_DIFF',
    };
  }

  // --- ДОВІДНИКИ (hash-diff) -----------------------------------------------

  private async syncEntities(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniEntities',
    );
    const mapped = rows.map((r) => mapEntity(ctx, r));
    return this.runHashDiff(ctx, 'mirrorEntity', mapped);
  }

  private async syncStores(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniStores',
    );
    const mapped = rows.map((r) => mapStore(ctx, r));
    return this.runHashDiff(ctx, 'mirrorStore', mapped);
  }

  private async syncUsers(ctx: MapperCtx, creds: MssqlCredentials) {
    // Не вибираємо fPassword/fPassword2 — паролі не потрапляють у мережу.
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      `SELECT fId, fCode, fName, fNamePrint, fState, fGroupID, fCardNumber, fGUID1, fGUID2
       FROM dbo.uniUsers`,
    );
    const mapped = rows.map((r) => mapUser(ctx, r));
    return this.runHashDiff(ctx, 'mirrorUser', mapped);
  }

  private async syncPartnerGroups(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniPartnersGroups',
    );
    const mapped = rows.map((r) => mapPartnerGroup(ctx, r));
    return this.runHashDiff(ctx, 'mirrorPartnerGroup', mapped);
  }

  private async syncPartners(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniPartners',
    );
    const mapped = rows.map((r) => mapPartner(ctx, r));
    return this.runHashDiff(ctx, 'mirrorPartner', mapped);
  }

  private async syncGoodsGroups(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniGoodsGroups',
    );
    const mapped = rows.map((r) => mapGoodsGroup(ctx, r));
    return this.runHashDiff(ctx, 'mirrorGoodsGroup', mapped);
  }

  private async syncGoods(ctx: MapperCtx, creds: MssqlCredentials) {
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT * FROM dbo.uniGoods',
    );
    const mapped = rows.map((r) => mapGood(ctx, r));
    return this.runHashDiff(ctx, 'mirrorGood', mapped);
  }

  private async syncStoreStock(ctx: MapperCtx, creds: MssqlCredentials) {
    // uniAStoreNow — невелика таблиця (≈ 13k рядків).
    const rows = await this.mssql.query<Record<string, unknown>>(
      creds,
      'SELECT fId, fEntId, fStoreId, fGoodId, fQtty, fSum FROM dbo.uniAStoreNow',
    );
    const mapped = rows.map((r) => mapStoreStock(ctx, r));
    return this.runHashDiff(ctx, 'mirrorStoreStock', mapped);
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

    return {
      read: totalRead,
      written: totalWritten,
      watermarkHex: maxWatermark,
      strategy: 'ROWVERSION' as SyncStrategy,
    };
  }

  // -------------------------------------------------------------------------

  private async upsertCursor(
    tenantId: string,
    dataSourceId: string,
    entity: SyncEntity,
    upd: {
      recordsTotal?: number;
      watermarkHex?: string | null;
      strategy?: SyncStrategy;
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
      ...(upd.strategy !== undefined ? { strategy: upd.strategy } : {}),
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
      strategy: upd.strategy ?? null,
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
