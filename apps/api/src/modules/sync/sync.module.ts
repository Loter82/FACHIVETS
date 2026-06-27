import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CredentialsCipherService } from './application/credentials-cipher.service';
import { DataSourcesService } from './application/data-sources.service';
import { UniproSyncService } from './application/unipro-sync.service';
import { MssqlAdapterService } from './infrastructure/mssql-adapter.service';
import { DataSourcesController } from './presentation/data-sources.controller';
import { SyncController } from './presentation/sync.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DataSourcesController, SyncController],
  providers: [
    CredentialsCipherService,
    MssqlAdapterService,
    DataSourcesService,
    UniproSyncService,
  ],
  exports: [
    DataSourcesService,
    CredentialsCipherService,
    MssqlAdapterService,
    UniproSyncService,
  ],
})
export class SyncModule {}
