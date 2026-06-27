import { Module } from '@nestjs/common';
import { TenantsService } from './application/tenants.service';
import { TenantsController } from './presentation/tenants.controller';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
