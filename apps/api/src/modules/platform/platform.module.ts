import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SyncModule } from '../sync/sync.module';
import { PlatformService } from './application/platform.service';
import { PlatformController } from './presentation/platform.controller';

@Module({
  imports: [PrismaModule, SyncModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
