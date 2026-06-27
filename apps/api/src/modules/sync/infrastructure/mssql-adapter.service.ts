import { Injectable, Logger } from '@nestjs/common';
import sql, { type config as MssqlConfig, type ConnectionPool } from 'mssql';
import type {
  MssqlCredentials,
  SchemaColumn,
  SchemaOverviewResponse,
  SchemaTable,
  TableColumnsResponse,
  TestConnectionResponse,
} from '@unipro-crm/shared-types';

const DEFAULT_CONNECT_TIMEOUT = 15_000;
const DEFAULT_REQUEST_TIMEOUT = 60_000;

/**
 * Read-only адаптер до MS SQL Server (Unipro/Z-CMD).
 *
 * Усі методи — лише SELECT. Жодних INSERT/UPDATE/DELETE/EXEC.
 * Для кожного запиту створюється окремий пул (короткоживучий), бо
 * креди шифруються per-tenant і не кешуються в пам'яті адаптера.
 */
@Injectable()
export class MssqlAdapterService {
  private readonly logger = new Logger(MssqlAdapterService.name);

  /** Швидкий тест: підключитися, виконати SELECT @@VERSION, повернути перелік таблиць. */
  async testConnection(cred: MssqlCredentials): Promise<TestConnectionResponse> {
    const t0 = Date.now();
    try {
      const pool = await this.connect(cred);
      try {
        const versionRes = await pool.request().query<{ v: string }>('SELECT @@VERSION AS v');
        const serverVersion = versionRes.recordset[0]?.v?.split('\n')[0]?.trim();

        const tablesRes = await pool
          .request()
          .query<{ schema: string; name: string; type: string }>(
            `SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS name, TABLE_TYPE AS type
             FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
             ORDER BY TABLE_SCHEMA, TABLE_NAME`,
          );
        const tables = tablesRes.recordset.map((r) => `${r.schema}.${r.name}`);

        return {
          ok: true,
          serverVersion,
          tables,
          durationMs: Date.now() - t0,
        };
      } finally {
        await pool.close().catch(() => undefined);
      }
    } catch (err) {
      const e = err as Error & { code?: string };
      this.logger.warn(`MSSQL test-connection failed: ${e.code ?? ''} ${e.message}`);
      return {
        ok: false,
        durationMs: Date.now() - t0,
        errorCode: e.code,
        errorMessage: e.message,
      };
    }
  }

  /**
   * Виконати read-only SELECT. Кидає помилку, якщо SQL містить не-SELECT statements.
   * Це м'який запобіжник на додачу до прав доступу MSSQL-користувача.
   */
  async query<T = Record<string, unknown>>(
    cred: MssqlCredentials,
    sqlText: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    this.ensureReadOnly(sqlText);
    const pool = await this.connect(cred);
    try {
      const req = pool.request();
      for (const [name, value] of Object.entries(params)) {
        req.input(name, value as never);
      }
      const res = await req.query<T>(sqlText);
      return res.recordset;
    } finally {
      await pool.close().catch(() => undefined);
    }
  }

  /** Огляд схеми: таблиці + view + приблизна кількість рядків (з sys.dm_db_partition_stats). */
  async listTables(cred: MssqlCredentials): Promise<SchemaOverviewResponse> {
    const t0 = Date.now();
    const pool = await this.connect(cred);
    try {
      const versionRes = await pool.request().query<{ v: string }>('SELECT @@VERSION AS v');
      const serverVersion = versionRes.recordset[0]?.v?.split('\n')[0]?.trim() ?? '';

      const sqlText = `
        SELECT
          s.name AS [schema],
          t.name AS [name],
          'BASE TABLE' AS [type],
          ISNULL(SUM(CASE WHEN ps.index_id IN (0,1) THEN ps.row_count ELSE 0 END), 0) AS [rowCount]
        FROM sys.tables t
          INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
          LEFT JOIN sys.dm_db_partition_stats ps ON ps.object_id = t.object_id
        WHERE t.is_ms_shipped = 0
        GROUP BY s.name, t.name
        UNION ALL
        SELECT s.name AS [schema], v.name AS [name], 'VIEW' AS [type], 0 AS [rowCount]
        FROM sys.views v
          INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
        WHERE v.is_ms_shipped = 0
        ORDER BY [schema], [name]
      `;
      const res = await pool
        .request()
        .query<{ schema: string; name: string; type: string; rowCount: number | string }>(sqlText);
      const tables: SchemaTable[] = res.recordset.map((r) => ({
        schema: r.schema,
        name: r.name,
        type: r.type === 'VIEW' ? 'VIEW' : 'BASE TABLE',
        rowCount: typeof r.rowCount === 'string' ? Number(r.rowCount) : r.rowCount,
      }));
      return {
        serverVersion,
        database: cred.database,
        tables,
        durationMs: Date.now() - t0,
      };
    } finally {
      await pool.close().catch(() => undefined);
    }
  }

  /** Колонки таблиці/в'юхи з типами, PK-флагом та identity. */
  async describeTable(
    cred: MssqlCredentials,
    schemaName: string,
    tableName: string,
  ): Promise<TableColumnsResponse> {
    const t0 = Date.now();
    const pool = await this.connect(cred);
    try {
      const sqlText = `
        WITH pk_cols AS (
          SELECT ic.object_id, ic.column_id
          FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
          WHERE i.is_primary_key = 1
        )
        SELECT
          c.name AS [name],
          tp.name AS [dataType],
          c.max_length AS [maxLength],
          c.precision AS [precision],
          c.scale AS [scale],
          c.is_nullable AS [isNullable],
          c.is_identity AS [isIdentity],
          OBJECT_DEFINITION(c.default_object_id) AS [defaultValue],
          c.column_id AS [ordinal],
          CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS [isPrimaryKey]
        FROM sys.columns c
          INNER JOIN sys.objects o ON o.object_id = c.object_id
          INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
          INNER JOIN sys.types tp ON tp.user_type_id = c.user_type_id
          LEFT JOIN pk_cols pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
        WHERE s.name = @schema AND o.name = @table
        ORDER BY c.column_id
      `;
      const res = await pool
        .request()
        .input('schema', sql.NVarChar(128), schemaName)
        .input('table', sql.NVarChar(128), tableName)
        .query<{
          name: string;
          dataType: string;
          maxLength: number;
          precision: number;
          scale: number;
          isNullable: boolean;
          isIdentity: boolean;
          defaultValue: string | null;
          ordinal: number;
          isPrimaryKey: number;
        }>(sqlText);
      const columns: SchemaColumn[] = res.recordset.map((r) => ({
        name: r.name,
        dataType: r.dataType,
        maxLength: r.maxLength === 0 ? null : r.maxLength,
        precision: r.precision === 0 ? null : r.precision,
        scale: r.scale === 0 ? null : r.scale,
        isNullable: Boolean(r.isNullable),
        isPrimaryKey: Boolean(r.isPrimaryKey),
        isIdentity: Boolean(r.isIdentity),
        defaultValue: r.defaultValue,
        ordinal: r.ordinal,
      }));
      return { schema: schemaName, name: tableName, columns, durationMs: Date.now() - t0 };
    } finally {
      await pool.close().catch(() => undefined);
    }
  }

  private async connect(cred: MssqlCredentials): Promise<ConnectionPool> {
    const cfg: MssqlConfig = {
      server: cred.host,
      port: cred.port,
      database: cred.database,
      user: cred.user,
      password: cred.password,
      connectionTimeout: cred.connectionTimeout ?? DEFAULT_CONNECT_TIMEOUT,
      requestTimeout: cred.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT,
      options: {
        encrypt: cred.encrypt ?? true,
        trustServerCertificate: cred.trustServerCertificate ?? true,
        instanceName: cred.instance,
        enableArithAbort: true,
      },
      pool: { max: 4, min: 0, idleTimeoutMillis: 10_000 },
    };
    const pool = new sql.ConnectionPool(cfg);
    await pool.connect();
    return pool;
  }

  /** Дозволяє лише SELECT/WITH-запити. Жодних розділювачів statements. */
  private ensureReadOnly(text: string): void {
    const stripped = text
      .replace(/--[^\n]*\n/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .trim();
    if (/;[^\s]/.test(stripped)) {
      throw new Error('Заборонено кілька SQL-стейтментів в одному запиті');
    }
    const firstKeyword = stripped.replace(/^\(+/, '').trim().split(/\s+/)[0]?.toUpperCase();
    if (firstKeyword !== 'SELECT' && firstKeyword !== 'WITH') {
      throw new Error(`Заборонений SQL: дозволено лише SELECT/WITH (отримано "${firstKeyword}")`);
    }
    if (/\b(INSERT|UPDATE|DELETE|MERGE|EXEC|EXECUTE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i.test(stripped)) {
      throw new Error('Заборонений SQL: знайдено write-кейворд');
    }
  }
}
