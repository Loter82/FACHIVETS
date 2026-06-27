import type {
  CreateDataSourceRequest,
  DataSourceDto,
  SchemaOverviewResponse,
  TableColumnsResponse,
  TestConnectionRequest,
  TestConnectionResponse,
  UpdateDataSourceRequest,
  MssqlCredentials,
  JsonAgentCredentials,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

interface ApiCreatePayload {
  name: string;
  type: 'UNIPRO_MSSQL' | 'UNIPRO_JSON_AGENT';
  mssql?: MssqlCredentials;
  jsonAgent?: JsonAgentCredentials;
  settings?: Record<string, unknown>;
}

interface ApiUpdatePayload {
  name?: string;
  mssql?: MssqlCredentials;
  jsonAgent?: JsonAgentCredentials;
  settings?: Record<string, unknown>;
  status?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
}

interface ApiTestPayload {
  type: 'UNIPRO_MSSQL' | 'UNIPRO_JSON_AGENT';
  mssql?: MssqlCredentials;
  jsonAgent?: JsonAgentCredentials;
}

function toApiPayload(req: CreateDataSourceRequest): ApiCreatePayload {
  if (req.type === 'UNIPRO_MSSQL') {
    return {
      name: req.name,
      type: req.type,
      mssql: req.credentials as MssqlCredentials,
      settings: req.settings,
    };
  }
  return {
    name: req.name,
    type: req.type,
    jsonAgent: req.credentials as JsonAgentCredentials,
    settings: req.settings,
  };
}

function toApiUpdatePayload(req: UpdateDataSourceRequest, hasMssql: boolean): ApiUpdatePayload {
  if (!req.credentials) {
    return { name: req.name, settings: req.settings, status: req.status };
  }
  if (hasMssql) {
    return {
      name: req.name,
      mssql: req.credentials as MssqlCredentials,
      settings: req.settings,
      status: req.status,
    };
  }
  return {
    name: req.name,
    jsonAgent: req.credentials as JsonAgentCredentials,
    settings: req.settings,
    status: req.status,
  };
}

function toApiTestPayload(req: TestConnectionRequest): ApiTestPayload {
  if (req.type === 'UNIPRO_MSSQL') {
    return { type: req.type, mssql: req.credentials as MssqlCredentials };
  }
  return { type: req.type, jsonAgent: req.credentials as JsonAgentCredentials };
}

export const dataSourcesApi = {
  async list(): Promise<DataSourceDto[]> {
    const { data } = await http.get<DataSourceDto[]>('/data-sources');
    return data;
  },
  async create(req: CreateDataSourceRequest): Promise<DataSourceDto> {
    const { data } = await http.post<DataSourceDto>('/data-sources', toApiPayload(req));
    return data;
  },
  async update(
    id: string,
    req: UpdateDataSourceRequest,
    isMssql: boolean,
  ): Promise<DataSourceDto> {
    const { data } = await http.patch<DataSourceDto>(
      `/data-sources/${id}`,
      toApiUpdatePayload(req, isMssql),
    );
    return data;
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/data-sources/${id}`);
  },
  async testEphemeral(req: TestConnectionRequest): Promise<TestConnectionResponse> {
    const { data } = await http.post<TestConnectionResponse>(
      '/data-sources/test',
      toApiTestPayload(req),
    );
    return data;
  },
  async testExisting(id: string): Promise<TestConnectionResponse> {
    const { data } = await http.post<TestConnectionResponse>(`/data-sources/${id}/test`);
    return data;
  },
  async getSchema(id: string): Promise<SchemaOverviewResponse> {
    const { data } = await http.get<SchemaOverviewResponse>(`/data-sources/${id}/schema`);
    return data;
  },
  async getTableColumns(
    id: string,
    schema: string,
    table: string,
  ): Promise<TableColumnsResponse> {
    const { data } = await http.get<TableColumnsResponse>(
      `/data-sources/${id}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/columns`,
    );
    return data;
  },
};
