import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { DashboardService } from '../application/dashboard.service';
import {
  DashboardCustomerItemsQueryDto,
  DashboardCustomersQueryDto,
  DashboardOverviewQueryDto,
} from './dto/dashboard.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('overview')
  overview(@CurrentUser() user: JwtPayload, @Query() q: DashboardOverviewQueryDto) {
    return this.dashboard.overview(user.tenantId, q.sourceId, q.period ?? 'month', {
      from: q.from,
      to: q.to,
    });
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('customers')
  customers(@CurrentUser() user: JwtPayload, @Query() q: DashboardCustomersQueryDto) {
    return this.dashboard.customersBreakdown(
      user.tenantId,
      q.sourceId,
      q.period ?? 'month',
      q.page ?? 1,
      q.pageSize ?? 50,
      { from: q.from, to: q.to },
    );
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('customers/:partnerId/items')
  customerItems(
    @CurrentUser() user: JwtPayload,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Query() q: DashboardCustomerItemsQueryDto,
  ) {
    return this.dashboard.customerItems(
      user.tenantId,
      q.sourceId,
      partnerId,
      q.period ?? 'month',
      q.limit ?? 200,
      { from: q.from, to: q.to },
    );
  }

  @Roles('OWNER', 'ADMIN')
  @Get('diag/cogs')
  diagCogs(@CurrentUser() user: JwtPayload, @Query('sourceId') sourceId?: string) {
    return this.dashboard.diagCogs(user.tenantId, sourceId);
  }
}
