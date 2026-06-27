import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.module';

/**
 * Хелпер: резолвить активне джерело даних для тенанта.
 *
 * Якщо передано `sourceIdOverride` — перевіряємо, що воно належить тенанту і повертаємо.
 * Інакше беремо перше ACTIVE джерело тенанта (за `createdAt asc`).
 */
@Injectable()
export class DataSourceResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(tenantId: string, sourceIdOverride?: string | null): Promise<string> {
    if (sourceIdOverride) {
      const ds = await this.prisma.dataSource.findFirst({
        where: { id: sourceIdOverride, tenantId },
        select: { id: true },
      });
      if (!ds) throw new NotFoundException('Джерело не знайдено');
      return ds.id;
    }
    const active = await this.prisma.dataSource.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!active) {
      throw new NotFoundException(
        'Не знайдено активного джерела даних. Налаштуйте підключення в розділі «Синхронізація».',
      );
    }
    return active.id;
  }
}
