import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { StockService } from '../application/stock.service';
import {
  StockAnalyticsQueryDto,
  StockGroupsQueryDto,
  StockListQueryDto,
  StockSummaryQueryDto,
} from './dto/stock.dto';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('summary')
  summary(@CurrentUser() user: JwtPayload, @Query() q: StockSummaryQueryDto) {
    return this.stock.summary(user.tenantId, q.sourceId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('groups')
  groups(@CurrentUser() user: JwtPayload, @Query() q: StockGroupsQueryDto) {
    return this.stock.groups(user.tenantId, q.sourceId, q.storeId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('items')
  list(@CurrentUser() user: JwtPayload, @Query() q: StockListQueryDto) {
    return this.stock.list(user.tenantId, q.sourceId, q);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get('analytics')
  analytics(@CurrentUser() user: JwtPayload, @Query() q: StockAnalyticsQueryDto) {
    return this.stock.analytics(user.tenantId, q.sourceId, q);
  }

  @Roles('OWNER', 'ADMIN')
  @Get('diag')
  diag(@CurrentUser() user: JwtPayload, @Query() q: StockSummaryQueryDto) {
    return this.stock.diag(user.tenantId, q.sourceId);
  }
}
