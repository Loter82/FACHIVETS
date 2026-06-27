import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TENANT_KEY, USER_KEY, USER_ROLE_KEY } from './tenant-context.module';
import type { UserRole } from '@prisma/client';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  set(tenantId: string, userId: string, role: UserRole): void {
    this.cls.set(TENANT_KEY, tenantId);
    this.cls.set(USER_KEY, userId);
    this.cls.set(USER_ROLE_KEY, role);
  }

  getTenantId(): string | undefined {
    return this.cls.get<string>(TENANT_KEY);
  }

  getUserId(): string | undefined {
    return this.cls.get<string>(USER_KEY);
  }

  getUserRole(): UserRole | undefined {
    return this.cls.get<UserRole>(USER_ROLE_KEY);
  }

  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('TenantContext: tenantId не встановлено');
    }
    return tenantId;
  }
}
