export type SyncEntityKind =
  | 'ENTITIES'
  | 'STORES'
  | 'USERS'
  | 'PARTNER_GROUPS'
  | 'PARTNERS'
  | 'GOODS_GROUPS'
  | 'GOODS'
  | 'DOCUMENTS'
  | 'DOCUMENT_ITEMS'
  | 'PAYMENTS';

export type SyncJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type SyncJobType =
  | 'TEST_CONNECTION'
  | 'FULL_SYNC'
  | 'INCREMENTAL_SYNC'
  | 'ENTITY_SYNC';

export interface SyncCursorDto {
  entity: SyncEntityKind;
  recordsTotal: number;
  watermarkHex: string | null;
  watermarkInt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
}

export interface SyncStatusResponse {
  cursors: SyncCursorDto[];
  counts: Record<SyncEntityKind, number>;
}

export interface SyncJobDto {
  id: string;
  tenantId: string;
  dataSourceId: string;
  type: SyncJobType;
  status: SyncJobStatus;
  entity: SyncEntityKind | null;
  startedAt: string | null;
  finishedAt: string | null;
  recordsRead: number;
  recordsWritten: number;
  errorMessage: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface RunEntitySyncResponse {
  jobId: string;
  status: SyncJobStatus;
  recordsRead: number;
  recordsWritten: number;
  durationMs: number;
  errorMessage?: string;
}
