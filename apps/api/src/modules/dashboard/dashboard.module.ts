import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SharedUniproModule } from '../shared/shared-unipro.module';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [PrismaModule, SharedUniproModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
