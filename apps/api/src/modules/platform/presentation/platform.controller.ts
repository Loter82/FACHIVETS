import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PlatformService } from '../application/platform.service';
import {
  CreatePlatformUserDto,
  CreateTenantDto,
  UpdatePlatformUserDto,
  UpdateTenantDto,
} from './dto/platform.dto';

/**
 * Platform-admin API — крос-тенант, тільки для PLATFORM_ADMIN.
 * Не використовуйте в тенантських UI: усі методи ігнорують tenant-контекст.
 */
@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
@Controller('platform')
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  // --- Tenants -------------------------------------------------------------

  @Get('tenants')
  listTenants() {
    return this.service.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  @HttpCode(204)
  async deleteTenant(@Param('id') id: string): Promise<void> {
    await this.service.deleteTenant(id);
  }

  // --- Users ---------------------------------------------------------------

  @Get('users')
  listUsers(@Query('tenantId') tenantId?: string) {
    return this.service.listUsers(tenantId);
  }

  @Post('users')
  createUser(@Body() dto: CreatePlatformUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdatePlatformUserDto) {
    return this.service.updateUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(204)
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.service.deleteUser(id);
  }
}
