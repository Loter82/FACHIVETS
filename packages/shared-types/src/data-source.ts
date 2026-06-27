export type DataSourceType = 'UNIPRO_MSSQL' | 'UNIPRO_JSON_AGENT';
export type DataSourceStatus = 'DRAFT' | 'ACTIVE' | 'ERROR' | 'DISABLED';

export interface MssqlCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  /** Назва іменованого інстансу MSSQL (наприклад "SQLEXPRESS"). */
  instance?: string;
  /** Чи використовувати TLS-шифрування з'єднання (за замовч. true). */
  encrypt?: boolean;
  /** Прийняти self-signed сертифікат (типово для локальних SQL Server). */
  trustServerCertificate?: boolean;
  /** Таймаут підключення в мс (default 15000). */
  connectionTimeout?: number;
  /** Таймаут запиту в мс (default 60000). */
  requestTimeout?: number;
}

export interface JsonAgentCredentials {
  /** URL агента у локальній мережі клієнта (наприклад https://agent.client.local/api). */
  agentUrl: string;
  /** Bearer-токен для авторизації запитів до агента. */
  agentToken: string;
}

export type DataSourceCredentials = MssqlCredentials | JsonAgentCredentials;

export interface DataSourceDto {
  id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  /** Безпечне резюме конфігу: host, database, user — пароль НІКОЛИ не повертається. */
  summary: DataSourceSummary;
  settings: Record<string, unknown>;
  lastTestedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataSourceSummary {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  instance?: string;
  agentUrl?: string;
}

export interface CreateDataSourceRequest {
  name: string;
  type: DataSourceType;
  credentials: DataSourceCredentials;
  settings?: Record<string, unknown>;
}

export interface UpdateDataSourceRequest {
  name?: string;
  /** Якщо передано — повністю замінює креди. Якщо не передано — старі лишаються. */
  credentials?: DataSourceCredentials;
  settings?: Record<string, unknown>;
  status?: Exclude<DataSourceStatus, 'ERROR'>;
}

export interface TestConnectionRequest {
  type: DataSourceType;
  credentials: DataSourceCredentials;
}

export interface TestConnectionResponse {
  ok: boolean;
  /** Версія сервера (наприклад "Microsoft SQL Server 2019..."). */
  serverVersion?: string;
  /** Список знайдених таблиць/в'юх (для перегляду перед мапінгом). */
  tables?: string[];
  /** Скільки мс зайняв тест. */
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SchemaTable {
  schema: string;
  name: string;
  type: 'BASE TABLE' | 'VIEW';
  rowCount: number;
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue: string | null;
  ordinal: number;
}

export interface SchemaOverviewResponse {
  serverVersion: string;
  database: string;
  tables: SchemaTable[];
  durationMs: number;
}

export interface TableColumnsResponse {
  schema: string;
  name: string;
  columns: SchemaColumn[];
  durationMs: number;
}
