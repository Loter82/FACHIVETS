import { ClsModule } from 'nestjs-cls';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
})
export class TenantContextModule {}

export const TENANT_KEY = 'tenantId';
export const USER_KEY = 'userId';
export const USER_ROLE_KEY = 'userRole';
