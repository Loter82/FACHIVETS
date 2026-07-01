import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.module';
import { SYNC_QUEUE_NAME } from '../infrastructure/sync-queue.module';

/** Payload одного sync-job'а. */
export interface SyncJobPayload {
  tenantId: string;
  dataSourceId: string;
  triggeredBy: 'scheduler' | 'manual';
}

const SCHEDULER_KEY_PREFIX = 'ds:';

/**
 * SyncSchedulerService — керує repeatable BullMQ-jobами для DataSource'ів.
 *
 * Правило: один DataSource ↔ один Job Scheduler (`ds:<dataSourceId>`).
 *  • enroll — створити/оновити розклад
 *  • unenroll — видалити розклад
 *  • bootstrap — на старті модуля синхронізувати стан із БД (актуалізує планувальники
 *    для всіх ACTIVE DataSource'ів з autoSyncEnabled=true)
 */
@Injectable()
export class SyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    @InjectQueue(SYNC_QUEUE_NAME) private readonly queue: Queue<SyncJobPayload>,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrap();
  }

  /** На старті додатку — синхронізувати планувальники з БД. */
  async bootstrap(): Promise<void> {
    try {
      const sources = await this.prisma.dataSource.findMany({
        where: { status: 'ACTIVE', autoSyncEnabled: true },
        include: { tenant: { select: { status: true } } },
      });
      let enrolled = 0;
      for (const s of sources) {
        if (s.tenant.status !== 'ACTIVE') continue;
        await this.enroll(s.tenantId, s.id, s.syncIntervalMinutes);
        enrolled += 1;
      }
      this.logger.log(`Bootstrap: enrolled ${enrolled}/${sources.length} data sources`);
    } catch (err) {
      // Redis може бути недоступний під час local dev — не валити застосунок.
      this.logger.error(
        `Bootstrap failed (Redis available?): ${(err as Error).message}`,
      );
    }
  }

  /** Створити/оновити repeatable-job для DataSource. */
  async enroll(tenantId: string, dataSourceId: string, intervalMinutes: number): Promise<void> {
    const clamped = Math.max(5, Math.min(1440, intervalMinutes));
    const every = clamped * 60_000;
    const key = SCHEDULER_KEY_PREFIX + dataSourceId;
    // upsertJobScheduler (BullMQ v5+) — атомарно створює/оновлює розклад.
    await this.queue.upsertJobScheduler(
      key,
      { every },
      {
        name: 'sync',
        data: { tenantId, dataSourceId, triggeredBy: 'scheduler' },
        opts: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 1,
        },
      },
    );
    await this.prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { nextScheduledAt: new Date(Date.now() + every) },
    });
    this.logger.log(`Enrolled ds=${dataSourceId} every=${clamped}min`);
  }

  /** Видалити repeatable-job (при вимкненні auto-sync або видаленні джерела). */
  async unenroll(dataSourceId: string): Promise<void> {
    const key = SCHEDULER_KEY_PREFIX + dataSourceId;
    try {
      await this.queue.removeJobScheduler(key);
      this.logger.log(`Unenrolled ds=${dataSourceId}`);
    } catch (err) {
      this.logger.warn(`Unenroll ds=${dataSourceId} failed: ${(err as Error).message}`);
    }
    await this.prisma.dataSource
      .update({
        where: { id: dataSourceId },
        data: { nextScheduledAt: null },
      })
      .catch(() => undefined);
  }

  /** Виконати одноразовий job негайно (з UI-кнопки "Синхронізувати зараз"). */
  async triggerNow(tenantId: string, dataSourceId: string): Promise<string> {
    const job = await this.queue.add(
      'sync',
      { tenantId, dataSourceId, triggeredBy: 'manual' },
      { removeOnComplete: 100, removeOnFail: 200, attempts: 1 },
    );
    return job.id ?? '';
  }
}
