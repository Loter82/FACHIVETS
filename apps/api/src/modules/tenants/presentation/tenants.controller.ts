import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { TenantsService } from '../application/tenants.service';

@ApiTags('tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  current(@CurrentUser() user: JwtPayload) {
    return this.tenants.getById(user.tenantId);
  }
}
