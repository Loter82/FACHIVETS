import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type {
  DataSourceDto,
  SyncCursorDto,
  SyncEntityKind,
  SyncJobDto,
} from '@unipro-crm/shared-types';
import { dataSourcesApi } from '@/features/data-sources/api';
import { syncApi } from './api';

const ENTITY_LABELS: Record<SyncEntityKind, { title: string; hint: string; order: number }> = {
  ENTITIES: { title: 'Організації', hint: 'uniEntities — юр.особи продавця', order: 1 },
  STORES: { title: 'Склади', hint: 'uniStores — фізичні склади / точки', order: 2 },
  USERS: { title: 'Співробітники', hint: 'uniUsers — без паролів', order: 3 },
  PARTNER_GROUPS: { title: 'Групи клієнтів', hint: 'uniPartnersGroups (дерево)', order: 4 },
  PARTNERS: { title: 'Клієнти / Постачальники', hint: 'uniPartners', order: 5 },
  GOODS_GROUPS: { title: 'Категорії товарів', hint: 'uniGoodsGroups (дерево)', order: 6 },
  GOODS: { title: 'Товари', hint: 'uniGoods — повна номенклатура', order: 7 },
  DOCUMENTS: { title: 'Документи', hint: 'uniDocuments + uniDocGoods (incremental по fRV)', order: 8 },
  DOCUMENT_ITEMS: { title: 'Позиції документів', hint: 'Синхронізуються разом з DOCUMENTS', order: 9 },
  PAYMENTS: { title: 'Платежі', hint: 'uniAPayments — у наступному релізі', order: 10 },
};

const SYNCABLE: SyncEntityKind[] = [
  'ENTITIES',
  'STORES',
  'USERS',
  'PARTNER_GROUPS',
  'PARTNERS',
  'GOODS_GROUPS',
  'GOODS',
  'DOCUMENTS',
];

const fmtDate = (s: string | null): string =>
  s ? new Date(s).toLocaleString('uk-UA') : '—';
const fmtNum = (n: number): string => new Intl.NumberFormat('uk-UA').format(n);

export function SyncPage() {
  const sources = useQuery({ queryKey: ['data-sources'], queryFn: dataSourcesApi.list });
  const active = useMemo(() => sources.data?.find((s) => s.status === 'ACTIVE'), [sources.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentId = selectedId ?? active?.id ?? null;

  if (sources.isLoading) {
    return <div className="loading loading-spinner loading-md" />;
  }
  if (!sources.data || sources.data.length === 0) {
    return <NoSource />;
  }
  if (!currentId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Синхронізація з Unipro</h1>
        <SourcePicker sources={sources.data} selectedId={currentId} onSelect={setSelectedId} />
        <div className="alert">Виберіть джерело з активним підключенням, щоб запустити синхронізацію.</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold md:text-2xl">Синхронізація з Unipro</h1>
          <p className="text-sm text-base-content/70">
            Підтягуємо довідники і документи з Unipro у локальне дзеркало для CRM.
          </p>
        </div>
        <SourcePicker
          sources={sources.data}
          selectedId={currentId}
          onSelect={setSelectedId}
        />
      </div>
      <SyncDashboard sourceId={currentId} />
    </div>
  );
}

function NoSource() {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body items-center text-center">
        <h2 className="card-title">Ще немає джерел даних</h2>
        <p className="text-base-content/70">
          Додайте підключення до Unipro у розділі «Налаштування → Джерела», перш ніж запускати синхронізацію.
        </p>
        <Link to="/settings/sources" className="btn btn-primary">
          Перейти до налаштувань
        </Link>
      </div>
    </div>
  );
}

function SourcePicker({
  sources,
  selectedId,
  onSelect,
}: {
  sources: DataSourceDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <select
      className="select select-bordered select-sm w-full sm:select-md sm:w-auto"
      value={selectedId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="" disabled>
        Виберіть джерело…
      </option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {s.status === 'ACTIVE' ? 'активне' : s.status.toLowerCase()}
        </option>
      ))}
    </select>
  );
}

function SyncDashboard({ sourceId }: { sourceId: string }) {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ['sync-status', sourceId],
    queryFn: () => syncApi.getStatus(sourceId),
    refetchInterval: 5_000,
  });
  const jobs = useQuery({
    queryKey: ['sync-jobs', sourceId],
    queryFn: () => syncApi.getJobs(sourceId, 30),
    refetchInterval: 5_000,
  });

  const runEntity = useMutation({
    mutationFn: (entity: SyncEntityKind) => syncApi.runEntity(sourceId, entity),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sync-status', sourceId] });
      qc.invalidateQueries({ queryKey: ['sync-jobs', sourceId] });
    },
  });
  const runAll = useMutation({
    mutationFn: () => syncApi.runAll(sourceId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sync-status', sourceId] });
      qc.invalidateQueries({ queryKey: ['sync-jobs', sourceId] });
    },
  });

  const cursorMap = useMemo(() => {
    const m = new Map<SyncEntityKind, SyncCursorDto>();
    status.data?.cursors.forEach((c) => m.set(c.entity, c));
    return m;
  }, [status.data]);

  const busyEntity =
    runEntity.isPending && runEntity.variables ? runEntity.variables : null;
  const allBusy = runAll.isPending;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          className="btn btn-primary btn-sm w-full sm:w-auto sm:btn-md"
          disabled={allBusy || runEntity.isPending}
          onClick={() => runAll.mutate()}
        >
          {allBusy ? (
            <>
              <span className="loading loading-spinner loading-sm" /> Запуск повної синхронізації…
            </>
          ) : (
            '⚡ Синхронізувати все'
          )}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            status.refetch();
            jobs.refetch();
          }}
        >
          Оновити
        </button>
        {runAll.isError && (
          <span className="text-error text-sm">
            Помилка: {(runAll.error as Error).message}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SYNCABLE.map((entity) => {
          const cursor = cursorMap.get(entity);
          const count = status.data?.counts[entity] ?? 0;
          const meta = ENTITY_LABELS[entity];
          const error = cursor?.lastError;
          const running = busyEntity === entity || allBusy;
          return (
            <div
              key={entity}
              className={`card bg-base-100 shadow ${error ? 'border border-error/40' : ''}`}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{meta.title}</h3>
                    <p className="text-xs text-base-content/60">{meta.hint}</p>
                  </div>
                  <span className="badge badge-ghost">{fmtNum(count)}</span>
                </div>
                <div className="text-xs text-base-content/70 mt-2 space-y-1">
                  <div>
                    Остання спроба: <b>{fmtDate(cursor?.lastRunAt ?? null)}</b>
                  </div>
                  <div>
                    Успіх: <b>{fmtDate(cursor?.lastSuccessAt ?? null)}</b>
                  </div>
                  {cursor?.watermarkHex && (
                    <div className="font-mono">
                      Watermark: <span className="text-primary">{cursor.watermarkHex}</span>
                    </div>
                  )}
                  {error && <div className="text-error">⚠ {error}</div>}
                </div>
                <div className="card-actions justify-end mt-3">
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={running || runEntity.isPending || allBusy}
                    onClick={() => runEntity.mutate(entity)}
                  >
                    {running ? (
                      <>
                        <span className="loading loading-spinner loading-xs" /> Синхронізую…
                      </>
                    ) : (
                      'Запустити'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <JobHistory jobs={jobs.data ?? []} />
    </>
  );
}

function JobHistory({ jobs }: { jobs: SyncJobDto[] }) {
  if (jobs.length === 0) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-lg">Журнал синхронізацій</h3>
          <p className="text-sm text-base-content/60">Поки що порожньо.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-0">
        <div className="p-4 pb-2">
          <h3 className="card-title text-lg">Журнал синхронізацій</h3>
          <p className="text-xs text-base-content/60">Останні 30 завдань</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Час</th>
                <th>Сутність</th>
                <th>Тип</th>
                <th>Статус</th>
                <th className="text-right">Прочитано</th>
                <th className="text-right">Записано</th>
                <th>Тривалість</th>
                <th>Помилка</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const dur =
                  j.startedAt && j.finishedAt
                    ? `${Math.round(
                        (new Date(j.finishedAt).getTime() -
                          new Date(j.startedAt).getTime()) /
                          100,
                      ) / 10}s`
                    : '—';
                const entity = j.entity ? ENTITY_LABELS[j.entity]?.title ?? j.entity : '—';
                return (
                  <tr key={j.id}>
                    <td className="text-xs">{fmtDate(j.createdAt)}</td>
                    <td>{entity}</td>
                    <td>
                      <span className="badge badge-ghost badge-sm">{j.type}</span>
                    </td>
                    <td>
                      <JobStatusBadge status={j.status} />
                    </td>
                    <td className="text-right">{fmtNum(j.recordsRead)}</td>
                    <td className="text-right">{fmtNum(j.recordsWritten)}</td>
                    <td>{dur}</td>
                    <td className="text-xs text-error">{j.errorMessage ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: SyncJobDto['status'] }) {
  const map: Record<SyncJobDto['status'], { label: string; cls: string }> = {
    QUEUED: { label: 'У черзі', cls: 'badge-ghost' },
    RUNNING: { label: 'Виконується', cls: 'badge-info' },
    SUCCESS: { label: 'OK', cls: 'badge-success' },
    FAILED: { label: 'Помилка', cls: 'badge-error' },
    CANCELLED: { label: 'Скасовано', cls: 'badge-warning' },
  };
  const v = map[status];
  return <span className={`badge badge-sm ${v.cls}`}>{v.label}</span>;
}
