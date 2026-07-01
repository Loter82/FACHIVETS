import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = req.user;

    // Немає ролі → публічний або пропущений auth. У останньому — інший guard відхилив.
    if (!user) {
      if (!required || required.length === 0) return true;
      throw new ForbiddenException('Доступ заборонено');
    }

    // PLATFORM_ADMIN: обходить всі перевірки статусу тенанта — це його адмінка.
    if (user.role === 'PLATFORM_ADMIN') {
      if (!required || required.length === 0) return true;
      if (!required.includes('PLATFORM_ADMIN')) {
        // Явно не дозволено на цьому ендпоінті — не пускаємо.
        throw new ForbiddenException('Недостатньо прав');
      }
      return true;
    }

    // Перевіряємо статус тенанта на кожному запиті — щоб suspend спрацював одразу.
    // Один SELECT з унікальним індексом — цінa нівелюється Postgres-плановиком.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true },
    });
    if (!tenant) throw new ForbiddenException('Тенант не знайдено');
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Тенант призупинено. Зверніться до адміністратора.');
    }

    if (!required || required.length === 0) return true;
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Недостатньо прав');
    }
    return true;
  }
}
