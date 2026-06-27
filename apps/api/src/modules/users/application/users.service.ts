import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserDto } from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listByTenant(tenantId: string): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toDto(u));
  }

  async getById(tenantId: string, id: string): Promise<UserDto> {
    const u = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('Користувача не знайдено');
    return this.toDto(u);
  }

  private toDto(u: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    role: UserDto['role'];
    status: UserDto['status'];
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserDto {
    return {
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }
}
