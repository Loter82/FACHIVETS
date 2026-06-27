import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  DataSourceDto,
  DataSourceSummary,
  DataSourceCredentials,
  JsonAgentCredentials,
  MssqlCredentials,
  SchemaOverviewResponse,
  TableColumnsResponse,
  TestConnectionResponse,
} from '@unipro-crm/shared-types';
import type { DataSource, DataSourceType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.module';
import { CredentialsCipherService } from './credentials-cipher.service';
import { MssqlAdapterService } from '../infrastructure/mssql-adapter.service';

@Injectable()
export class DataSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: CredentialsCipherService,
    private readonly mssql: MssqlAdapterService,
  ) {}

  async list(tenantId: string): Promise<DataSourceDto[]> {
    const rows = await this.prisma.dataSource.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getById(tenantId: string, id: string): Promise<DataSourceDto> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');
    return this.toDto(row);
  }

  async create(
    tenantId: string,
    input: {
      name: string;
      type: DataSourceType;
      credentials: DataSourceCredentials;
      settings?: Record<string, unknown>;
    },
  ): Promise<DataSourceDto> {
    const existing = await this.prisma.dataSource.findUnique({
      where: { tenantId_name: { tenantId, name: input.name } },
    });
    if (existing) throw new BadRequestException('Джерело з такою назвою вже існує');

    const credentialsCipher = this.cipher.encrypt(input.credentials);
    const created = await this.prisma.dataSource.create({
      data: {
        tenantId,
        name: input.name,
        type: input.type,
        credentialsCipher,
        settings: (input.settings ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toDto(created);
  }

  async update(
    tenantId: string,
    id: string,
    input: {
      name?: string;
      credentials?: DataSourceCredentials;
      settings?: Record<string, unknown>;
      status?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
    },
  ): Promise<DataSourceDto> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');

    const data: Prisma.DataSourceUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.settings) data.settings = input.settings as Prisma.InputJsonValue;
    if (input.status) data.status = input.status;
    if (input.credentials) data.credentialsCipher = this.cipher.encrypt(input.credentials);

    const updated = await this.prisma.dataSource.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');
    await this.prisma.dataSource.delete({ where: { id } });
  }

  /** Тест підключення для існуючого джерела — оновлює статус + lastErrorMessage. */
  async testExisting(tenantId: string, id: string): Promise<TestConnectionResponse> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');
    const creds = this.cipher.decrypt<DataSourceCredentials>(row.credentialsCipher);
    const result = await this.runTest(row.type, creds);
    await this.prisma.dataSource.update({
      where: { id },
      data: result.ok
        ? {
            status: 'ACTIVE',
            lastTestedAt: new Date(),
            lastSuccessAt: new Date(),
            lastErrorAt: null,
            lastErrorMessage: null,
          }
        : {
            status: 'ERROR',
            lastTestedAt: new Date(),
            lastErrorAt: new Date(),
            lastErrorMessage: result.errorMessage ?? 'Невідома помилка',
          },
    });
    return result;
  }

  /** Тест підключення з payload без збереження (для UI-форми). */
  async testEphemeral(
    type: DataSourceType,
    credentials: DataSourceCredentials,
  ): Promise<TestConnectionResponse> {
    return this.runTest(type, credentials);
  }

  /** Огляд схеми Unipro: список таблиць/view із приблизним rowCount. */
  async getSchema(tenantId: string, id: string): Promise<SchemaOverviewResponse> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');
    if (row.type !== 'UNIPRO_MSSQL') {
      throw new BadRequestException('Огляд схеми доступний лише для MSSQL-джерел');
    }
    const creds = this.cipher.decrypt<MssqlCredentials>(row.credentialsCipher);
    return this.mssql.listTables(creds);
  }

  /** Колонки конкретної таблиці. */
  async getTableColumns(
    tenantId: string,
    id: string,
    schema: string,
    table: string,
  ): Promise<TableColumnsResponse> {
    const row = await this.prisma.dataSource.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Джерело не знайдено');
    if (row.type !== 'UNIPRO_MSSQL') {
      throw new BadRequestException('Огляд схеми доступний лише для MSSQL-джерел');
    }
    const creds = this.cipher.decrypt<MssqlCredentials>(row.credentialsCipher);
    return this.mssql.describeTable(creds, schema, table);
  }

  private async runTest(
    type: DataSourceType,
    credentials: DataSourceCredentials,
  ): Promise<TestConnectionResponse> {
    if (type === 'UNIPRO_MSSQL') {
      return this.mssql.testConnection(credentials as MssqlCredentials);
    }
    // JSON-агент — імплементація в Етапі 1б; зараз повертаємо not-implemented
    return {
      ok: false,
      durationMs: 0,
      errorCode: 'NOT_IMPLEMENTED',
      errorMessage: 'JSON-агент буде реалізовано в наступному релізі',
    };
  }

  private toDto(row: DataSource): DataSourceDto {
    let summary: DataSourceSummary = {};
    try {
      const c = this.cipher.decrypt<DataSourceCredentials>(row.credentialsCipher);
      if (row.type === 'UNIPRO_MSSQL') {
        const m = c as MssqlCredentials;
        summary = {
          host: m.host,
          port: m.port,
          database: m.database,
          user: m.user,
          instance: m.instance,
        };
      } else {
        const a = c as JsonAgentCredentials;
        summary = { agentUrl: a.agentUrl };
      }
    } catch {
      // Якщо ENCRYPTION_KEY змінився — креди недешифровувані. Не падаємо.
      summary = {};
    }
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      summary,
      settings: row.settings as Record<string, unknown>,
      lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
      lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: row.lastErrorAt?.toISOString() ?? null,
      lastErrorMessage: row.lastErrorMessage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
