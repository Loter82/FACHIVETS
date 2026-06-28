import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { CustomersService } from '../application/customers.service';
import {
  CustomerListQueryDto,
  CustomerMonthlyQueryDto,
  CustomerOrdersQueryDto,
  CustomerProfileQueryDto,
} from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() q: CustomerListQueryDto) {
    return this.customers.list(user.tenantId, q.sourceId, q);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get(':id')
  profile(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() q: CustomerProfileQueryDto,
  ) {
    return this.customers.profile(user.tenantId, q.sourceId, id);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get(':id/orders')
  orders(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() q: CustomerOrdersQueryDto,
  ) {
    return this.customers.orders(user.tenantId, q.sourceId, id, q.page, q.pageSize);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  @Get(':id/monthly')
  monthly(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() q: CustomerMonthlyQueryDto,
  ) {
    return this.customers.monthly(user.tenantId, q.sourceId, id, {
      from: q.from,
      to: q.to,
      months: q.months,
    });
  }
}
