import { Injectable, NotFoundException } from '@nestjs/common';
import type { TenantDto } from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<TenantDto> {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Тенант не знайдено');
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
