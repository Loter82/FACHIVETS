import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  CreatePlatformUserRequest,
  CreateTenantRequest,
  PlatformOverview,
  PlatformTenantDto,
  PlatformUserDto,
  UpdatePlatformUserRequest,
  UpdateTenantRequest,
} from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import { SyncSchedulerService } from '../../sync/application/sync-scheduler.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  // ---------------------------------------------------------------------------
  // Tenants
  // ---------------------------------------------------------------------------

  async listTenants(): Promise<PlatformTenantDto[]> {
    const rows = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, dataSources: true } },
        dataSources: {
          select: { status: true, lastSuccessAt: true, lastErrorAt: true, lastErrorMessage: true },
        },
      },
    });
    return rows.map((t) => {
      const active = t.dataSources.filter((d) => d.status === 'ACTIVE');
      const lastSuccess = active
        .map((d) => d.lastSuccessAt)
        .filter((x): x is Date => !!x)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      const lastError = active
        .map((d) => (d.lastErrorAt ? { at: d.lastErrorAt, msg: d.lastErrorMessage } : null))
        .filter((x): x is { at: Date; msg: string | null } => !!x)
        .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        usersCount: t._count.users,
        dataSourcesCount: t._count.dataSources,
        activeDataSourcesCount: active.length,
        lastSyncAt: lastSuccess?.toISOString() ?? null,
        lastSyncError: lastError?.msg ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  }

  async createTenant(input: CreateTenantRequest): Promise<PlatformTenantDto> {
    const slug = input.slug.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
      throw new BadRequestException('slug має містити 2–41 символів [a-z0-9-]');
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Тенант з таким slug вже існує');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.name,
        slug,
        plan: input.plan ?? 'TRIAL',
        status: input.status ?? 'ACTIVE',
      },
    });

    if (input.owner) {
      const email = input.owner.email.toLowerCase().trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new BadRequestException('Невалідний email власника');
      }
      if (input.owner.password.length < 8) {
        throw new BadRequestException('Пароль має бути не коротший 8 символів');
      }
      const passwordHash = await bcrypt.hash(input.owner.password, 10);
      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          fullName: input.owner.fullName,
          role: input.owner.role ?? 'OWNER',
          status: 'ACTIVE',
        },
      });
    }

    const list = await this.listTenants();
    const dto = list.find((t) => t.id === tenant.id);
    if (!dto) throw new NotFoundException('Створений тенант не знайдено');
    return dto;
  }

  async updateTenant(id: string, input: UpdateTenantRequest): Promise<PlatformTenantDto> {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Тенант не знайдено');

    const wasActive = t.status === 'ACTIVE';
    const willBeActive = (input.status ?? t.status) === 'ACTIVE';

    if (input.slug && input.slug !== t.slug) {
      const slug = input.slug.toLowerCase().trim();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
        throw new BadRequestException('slug має містити 2–41 символів [a-z0-9-]');
      }
      const dup = await this.prisma.tenant.findUnique({ where: { slug } });
      if (dup && dup.id !== id) throw new ConflictException('slug вже використовується');
    }

    await this.prisma.tenant.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug?.toLowerCase().trim(),
        plan: input.plan,
        status: input.status,
      },
    });

    // Якщо тенант з ACTIVE став SUSPENDED — знімаємо всі його розклади.
    // Якщо навпаки — вмикаємо назад активні джерела з autoSyncEnabled.
    if (wasActive && !willBeActive) {
      const sources = await this.prisma.dataSource.findMany({ where: { tenantId: id } });
      for (const s of sources) await this.scheduler.unenroll(s.id);
    } else if (!wasActive && willBeActive) {
      const sources = await this.prisma.dataSource.findMany({
        where: { tenantId: id, status: 'ACTIVE', autoSyncEnabled: true },
      });
      for (const s of sources) {
        await this.scheduler.enroll(s.tenantId, s.id, s.syncIntervalMinutes);
      }
    }

    const list = await this.listTenants();
    const dto = list.find((x) => x.id === id);
    if (!dto) throw new NotFoundException('Тенант не знайдено');
    return dto;
  }

  async deleteTenant(id: string): Promise<void> {
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      include: { dataSources: { select: { id: true } } },
    });
    if (!t) throw new NotFoundException('Тенант не знайдено');
    if (t.slug === (process.env.PLATFORM_TENANT_SLUG ?? '_platform')) {
      throw new BadRequestException('Неможливо видалити платформ-тенант');
    }
    for (const s of t.dataSources) await this.scheduler.unenroll(s.id);
    await this.prisma.tenant.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Users (крос-тенантно)
  // ---------------------------------------------------------------------------

  async listUsers(tenantId?: string): Promise<PlatformUserDto[]> {
    const rows = await this.prisma.user.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: [{ tenantId: 'asc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { slug: true } } },
    });
    return rows.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      tenantSlug: u.tenant.slug,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async createUser(input: CreatePlatformUserRequest): Promise<PlatformUserDto> {
    const email = input.email.toLowerCase().trim();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new NotFoundException('Тенант не знайдено');
    const dup = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email } },
    });
    if (dup) throw new ConflictException('Користувач з таким email вже існує у цьому тенанті');
    if (input.password.length < 8) {
      throw new BadRequestException('Пароль має бути не коротший 8 символів');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        status: input.status ?? 'ACTIVE',
      },
      include: { tenant: { select: { slug: true } } },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      tenantSlug: created.tenant.slug,
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      status: created.status,
      lastLoginAt: null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateUser(id: string, input: UpdatePlatformUserRequest): Promise<PlatformUserDto> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Користувача не знайдено');
    if (u.role === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Редагування платформ-адмінів через цей API заборонено');
    }
    const data: Record<string, unknown> = {};
    if (input.email !== undefined) data.email = input.email.toLowerCase().trim();
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.role !== undefined) data.role = input.role;
    if (input.status !== undefined) data.status = input.status;
    if (input.password !== undefined) {
      if (input.password.length < 8) {
        throw new BadRequestException('Пароль має бути не коротший 8 символів');
      }
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { tenant: { select: { slug: true } } },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      tenantSlug: updated.tenant.slug,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      status: updated.status,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteUser(id: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Користувача не знайдено');
    if (u.role === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Видалення платформ-адмінів через цей API заборонено');
    }
    await this.prisma.user.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async overview(): Promise<PlatformOverview> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [tenantsTotal, tenantsActive, tenantsSuspended, usersTotal, dataSourcesTotal, jobs] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.user.count(),
        this.prisma.dataSource.count(),
        this.prisma.syncJob.groupBy({
          by: ['status'],
          where: { createdAt: { gte: dayAgo } },
          _count: { _all: true },
        }),
      ]);
    const jobCounts = { success: 0, failed: 0, running: 0 };
    for (const j of jobs) {
      if (j.status === 'SUCCESS') jobCounts.success = j._count._all;
      if (j.status === 'FAILED') jobCounts.failed = j._count._all;
      if (j.status === 'RUNNING' || j.status === 'QUEUED') jobCounts.running += j._count._all;
    }
    return {
      tenantsTotal,
      tenantsActive,
      tenantsSuspended,
      usersTotal,
      dataSourcesTotal,
      jobsLast24h: jobCounts,
    };
  }
}
