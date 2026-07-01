import type { TenantPlan, TenantStatus } from './tenant';
import type { UserRole, UserStatus } from './user';

/**
 * Розширений вигляд тенанта для платформ-адмінки.
 * Не використовуйте для звичайних тенант-скопованих ендпоінтів.
 */
export interface PlatformTenantDto {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  usersCount: number;
  dataSourcesCount: number;
  activeDataSourcesCount: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  /** Одразу створити першого користувача-власника. */
  owner?: {
    email: string;
    password: string;
    fullName: string;
    role?: Extract<UserRole, 'OWNER' | 'ADMIN'>;
  };
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
}

export interface PlatformUserDto {
  id: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreatePlatformUserRequest {
  tenantId: string;
  email: string;
  password: string;
  fullName: string;
  role: Exclude<UserRole, 'PLATFORM_ADMIN'>;
  status?: UserStatus;
}

export interface UpdatePlatformUserRequest {
  email?: string;
  fullName?: string;
  /** Якщо передано — пароль скидається. */
  password?: string;
  role?: Exclude<UserRole, 'PLATFORM_ADMIN'>;
  status?: UserStatus;
}

export interface PlatformOverview {
  tenantsTotal: number;
  tenantsActive: number;
  tenantsSuspended: number;
  usersTotal: number;
  dataSourcesTotal: number;
  jobsLast24h: {
    success: number;
    failed: number;
    running: number;
  };
}
