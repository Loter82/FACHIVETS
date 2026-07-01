import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import type { AppEnv } from '@/config/env.validation';

export const SYNC_QUEUE_NAME = 'sync-queue';

/**
 * Реєстрація BullMQ-черги 'sync-queue' з підключенням до Redis з ENV.
 *
 * REDIS_URL має пріоритет. Якщо його немає — беруться REDIS_HOST/REDIS_PORT.
 * BullMQ вимагає maxRetriesPerRequest = null та enableReadyCheck = false.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => {
        const url = config.get('REDIS_URL', { infer: true });
        const base = {
          maxRetriesPerRequest: null as null,
          enableReadyCheck: false,
        };
        // BullMQ побудує ioredis-клієнти сам, зі своєї версії — уникаємо конфліктів typing.
        const connection: ConnectionOptions = url
          ? ({ ...base, ...parseRedisUrl(url) } as ConnectionOptions)
          : ({
              ...base,
              host: config.get('REDIS_HOST', { infer: true }),
              port: config.get('REDIS_PORT', { infer: true }),
            } as ConnectionOptions);
        return { connection };
      },
    }),
    BullModule.registerQueue({ name: SYNC_QUEUE_NAME }),
  ],
  exports: [BullModule],
})
export class SyncQueueModule {}

function parseRedisUrl(raw: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
} {
  const u = new URL(raw);
  const port = u.port ? Number(u.port) : 6379;
  const db = u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined;
  const out: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
    tls?: Record<string, unknown>;
  } = { host: u.hostname, port };
  if (u.username) out.username = decodeURIComponent(u.username);
  if (u.password) out.password = decodeURIComponent(u.password);
  if (db !== undefined && !Number.isNaN(db)) out.db = db;
  if (u.protocol === 'rediss:') out.tls = {};
  return out;
}

