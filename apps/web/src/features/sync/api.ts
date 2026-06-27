import type {
  RunEntitySyncResponse,
  SyncEntityKind,
  SyncJobDto,
  SyncStatusResponse,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const syncApi = {
  async getStatus(sourceId: string): Promise<SyncStatusResponse> {
    const { data } = await http.get<SyncStatusResponse>(`/sync/${sourceId}/status`);
    return data;
  },
  async getJobs(sourceId: string, limit = 30): Promise<SyncJobDto[]> {
    const { data } = await http.get<SyncJobDto[]>(`/sync/${sourceId}/jobs?limit=${limit}`);
    return data;
  },
  async runEntity(sourceId: string, entity: SyncEntityKind): Promise<RunEntitySyncResponse> {
    const { data } = await http.post<RunEntitySyncResponse>(`/sync/${sourceId}/run`, { entity });
    return data;
  },
  async runAll(sourceId: string): Promise<RunEntitySyncResponse[]> {
    const { data } = await http.post<RunEntitySyncResponse[]>(`/sync/${sourceId}/run-all`);
    return data;
  },
};
