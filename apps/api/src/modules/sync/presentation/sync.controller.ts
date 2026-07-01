import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SyncEntity } from '@prisma/client';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { SyncSchedulerService } from '../application/sync-scheduler.service';
import { UniproSyncService } from '../application/unipro-sync.service';
import { RunEntitySyncDto } from './dto/sync.dto';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: UniproSyncService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  /** Зведений статус по сутностях + лічильники mirror-таблиць. */
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get(':sourceId/status')
  status(@CurrentUser() user: JwtPayload, @Param('sourceId') sourceId: string) {
    return this.sync.getStatus(user.tenantId, sourceId);
  }

  /** Журнал останніх синхронізаційних завдань. */
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get(':sourceId/jobs')
  jobs(
    @CurrentUser() user: JwtPayload,
    @Param('sourceId') sourceId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(Math.max(Number(limit), 1), 200) : 30;
    return this.sync.getJobs(user.tenantId, sourceId, n);
  }

  /** Запустити синхронізацію однієї сутності (синхронно, без черги). */
  @Roles('OWNER', 'ADMIN')
  @Post(':sourceId/run')
  run(
    @CurrentUser() user: JwtPayload,
    @Param('sourceId') sourceId: string,
    @Body() dto: RunEntitySyncDto,
  ) {
    return this.sync.runEntitySync(user.tenantId, sourceId, dto.entity as SyncEntity);
  }

  /** Запустити повну синхронізацію всіх довідників + документів (синхронно). */
  @Roles('OWNER', 'ADMIN')
  @Post(':sourceId/run-all')
  runAll(@CurrentUser() user: JwtPayload, @Param('sourceId') sourceId: string) {
    return this.sync.runFullSync(user.tenantId, sourceId);
  }

  /**
   * Поставити задачу повного синку в BullMQ-чергу і повернутися одразу.
   * Використовуйте з UI, коли не хочеться тримати HTTP-запит хвилини.
   */
  @Roles('OWNER', 'ADMIN')
  @Post(':sourceId/enqueue')
  async enqueue(@CurrentUser() user: JwtPayload, @Param('sourceId') sourceId: string) {
    const jobId = await this.scheduler.triggerNow(user.tenantId, sourceId);
    return { jobId };
  }
}
