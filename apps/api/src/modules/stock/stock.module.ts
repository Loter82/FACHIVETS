import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SharedUniproModule } from '../shared/shared-unipro.module';
import { StockService } from './application/stock.service';
import { StockController } from './presentation/stock.controller';

@Module({
  imports: [PrismaModule, SharedUniproModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
