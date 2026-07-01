import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  DataSourceCredentials,
  JwtPayload,
  TestConnectionResponse,
} from '@unipro-crm/shared-types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { DataSourcesService } from '../application/data-sources.service';
import {
  CreateDataSourceDto,
  DataSourceTypeDto,
  TestConnectionDto,
  UpdateDataSourceDto,
} from './dto/data-source.dto';

@ApiTags('data-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-sources')
export class DataSourcesController {
  constructor(private readonly service: DataSourcesService) {}

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get(':id')
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDataSourceDto) {
    return this.service.create(user.tenantId, {
      name: dto.name,
      type: dto.type,
      credentials: extractCredentials(dto.type, dto.mssql, dto.jsonAgent),
      settings: dto.settings,
    });
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDataSourceDto,
  ) {
    const credentials =
      dto.mssql || dto.jsonAgent
        ? extractCredentials(
            dto.mssql ? DataSourceTypeDto.UNIPRO_MSSQL : DataSourceTypeDto.UNIPRO_JSON_AGENT,
            dto.mssql,
            dto.jsonAgent,
          )
        : undefined;
    return this.service.update(user.tenantId, id, {
      name: dto.name,
      credentials,
      settings: dto.settings,
      status: dto.status,
      autoSyncEnabled: dto.autoSyncEnabled,
      syncIntervalMinutes: dto.syncIntervalMinutes,
    });
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.service.remove(user.tenantId, id);
  }

  /** Тест без збереження — для UI-форми перед `Зберегти`. */
  @Roles('OWNER', 'ADMIN')
  @Post('test')
  testEphemeral(@Body() dto: TestConnectionDto): Promise<TestConnectionResponse> {
    return this.service.testEphemeral(
      dto.type,
      extractCredentials(dto.type, dto.mssql, dto.jsonAgent),
    );
  }

  /** Тест існуючого джерела — оновлює статус. */
  @Roles('OWNER', 'ADMIN')
  @Post(':id/test')
  testExisting(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.testExisting(user.tenantId, id);
  }

  /** Огляд схеми MSSQL: список таблиць + view з rowCount. */
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get(':id/schema')
  schema(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getSchema(user.tenantId, id);
  }

  /** Колонки конкретної таблиці. */
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Get(':id/tables/:schema/:table/columns')
  columns(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
  ) {
    return this.service.getTableColumns(user.tenantId, id, schema, table);
  }

  /** Діагностика: шукає таблиці залишків у джерелі. */
  @Roles('OWNER', 'ADMIN')
  @Get(':id/diag/stock-tables')
  diagStockTables(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.diagStockTables(user.tenantId, id);
  }
}

function extractCredentials(
  type: DataSourceTypeDto,
  mssql: TestConnectionDto['mssql'],
  jsonAgent: TestConnectionDto['jsonAgent'],
): DataSourceCredentials {
  if (type === DataSourceTypeDto.UNIPRO_MSSQL) {
    if (!mssql) throw new Error('Для UNIPRO_MSSQL потрібні поля mssql');
    return mssql;
  }
  if (!jsonAgent) throw new Error('Для UNIPRO_JSON_AGENT потрібні поля jsonAgent');
  return jsonAgent;
}
