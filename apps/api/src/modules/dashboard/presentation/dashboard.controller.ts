import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { DashboardService } from '../application/dashboard.service';
import { DashboardOverviewQueryDto } from './dto/dashboard.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('overview')
  overview(@CurrentUser() user: JwtPayload, @Query() q: DashboardOverviewQueryDto) {
    return this.dashboard.overview(user.tenantId, q.sourceId, q.period ?? 'month');
  }
}
