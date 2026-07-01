import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CredentialsCipherService } from './application/credentials-cipher.service';
import { DataSourcesService } from './application/data-sources.service';
import { SyncSchedulerService } from './application/sync-scheduler.service';
import { UniproSyncService } from './application/unipro-sync.service';
import { MssqlAdapterService } from './infrastructure/mssql-adapter.service';
import { SyncProcessor } from './infrastructure/sync.processor';
import { SyncQueueModule } from './infrastructure/sync-queue.module';
import { DataSourcesController } from './presentation/data-sources.controller';
import { SyncController } from './presentation/sync.controller';

@Module({
  imports: [PrismaModule, SyncQueueModule],
  controllers: [DataSourcesController, SyncController],
  providers: [
    CredentialsCipherService,
    MssqlAdapterService,
    DataSourcesService,
    UniproSyncService,
    SyncSchedulerService,
    SyncProcessor,
  ],
  exports: [
    DataSourcesService,
    CredentialsCipherService,
    MssqlAdapterService,
    UniproSyncService,
    SyncSchedulerService,
  ],
})
export class SyncModule {}
