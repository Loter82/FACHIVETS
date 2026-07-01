import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import type { AppEnv } from '@/config/env.validation';
import { PrismaService } from '@/prisma/prisma.module';
import { UniproSyncService } from '../application/unipro-sync.service';
import type { SyncJobPayload } from '../application/sync-scheduler.service';
import { SYNC_QUEUE_NAME } from './sync-queue.module';

/**
 * Bull-воркер для черги 'sync-queue'.
 *
 * Кожен job — це повний прохід усіх сутностей для одного DataSource:
 *   довідники через hash-diff, документи через rowversion.
 *
 * Перевіряє тенант.status і dataSource.autoSyncEnabled щоразу — якщо тенант
 * SUSPENDED або autoSync вимкнено, виконання пропускається (для manual — не пропускає).
 */
@Processor(SYNC_QUEUE_NAME, { concurrency: 2 })
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: UniproSyncService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {
    super();
  }

  override async process(job: Job<SyncJobPayload>): Promise<{ ok: boolean; reason?: string }> {
    const { tenantId, dataSourceId, triggeredBy } = job.data;

    if (!this.config.get('SYNC_WORKER_ENABLED', { infer: true })) {
      this.logger.debug(`Worker disabled by env — skipping job ${job.id}`);
      return { ok: false, reason: 'worker-disabled' };
    }

    const ds = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: { tenant: { select: { status: true } } },
    });
    if (!ds) {
      this.logger.warn(`Job ${job.id}: dataSource ${dataSourceId} not found`);
      return { ok: false, reason: 'not-found' };
    }
    if (ds.tenantId !== tenantId) {
      this.logger.warn(`Job ${job.id}: tenant mismatch`);
      return { ok: false, reason: 'tenant-mismatch' };
    }
    if (ds.tenant.status !== 'ACTIVE') {
      this.logger.warn(`Job ${job.id}: tenant SUSPENDED — skipping`);
      return { ok: false, reason: 'tenant-suspended' };
    }
    if (triggeredBy === 'scheduler') {
      if (ds.status !== 'ACTIVE' || !ds.autoSyncEnabled) {
        this.logger.debug(`Job ${job.id}: autoSync off — skipping`);
        return { ok: false, reason: 'auto-sync-off' };
      }
    }

    this.logger.log(
      `Job ${job.id}: sync tenant=${tenantId} ds=${dataSourceId} triggeredBy=${triggeredBy}`,
    );
    const results = await this.sync.runFullSync(tenantId, dataSourceId);

    const now = new Date();
    const nextScheduledAt =
      triggeredBy === 'scheduler'
        ? new Date(now.getTime() + Math.max(5, ds.syncIntervalMinutes) * 60_000)
        : ds.nextScheduledAt;

    await this.prisma.dataSource.update({
      where: { id: dataSourceId },
      data: {
        lastAutoRunAt: triggeredBy === 'scheduler' ? now : ds.lastAutoRunAt,
        nextScheduledAt,
      },
    });

    const summary = results.reduce(
      (acc, r) => ({
        read: acc.read + r.recordsRead,
        written: acc.written + r.recordsWritten,
        failed: acc.failed + (r.status === 'FAILED' ? 1 : 0),
      }),
      { read: 0, written: 0, failed: 0 },
    );
    this.logger.log(
      `Job ${job.id}: done — read=${summary.read} written=${summary.written} failed=${summary.failed}`,
    );
    return { ok: summary.failed === 0 };
  }
}
