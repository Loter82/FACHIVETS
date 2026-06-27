import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SharedUniproModule } from '../shared/shared-unipro.module';
import { CustomersService } from './application/customers.service';
import { CustomersController } from './presentation/customers.controller';

@Module({
  imports: [PrismaModule, SharedUniproModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
