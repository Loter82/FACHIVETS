import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { SchemaColumn, SchemaTable } from '@unipro-crm/shared-types';
import { dataSourcesApi } from './api';

export function SchemaInspectorPage() {
  const { id } = useParams<{ id: string }>();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<{ schema: string; name: string } | null>(null);

  const schema = useQuery({
    queryKey: ['data-source-schema', id],
    queryFn: () => dataSourcesApi.getSchema(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const columns = useQuery({
    queryKey: ['data-source-columns', id, selected?.schema, selected?.name],
    queryFn: () => dataSourcesApi.getTableColumns(id!, selected!.schema, selected!.name),
    enabled: !!id && !!selected,
    staleTime: 60_000,
  });

  const filtered = useMemo<SchemaTable[]>(() => {
    if (!schema.data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return schema.data.tables;
    return schema.data.tables.filter((t) =>
      `${t.schema}.${t.name}`.toLowerCase().includes(q),
    );
  }, [schema.data, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-base-content/60">
            <Link to="/settings" className="link">
              ← Джерела даних
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Схема бази Unipro</h1>
          {schema.data && (
            <p className="text-sm text-base-content/70">
              {schema.data.serverVersion} · база <b>{schema.data.database}</b> ·{' '}
              {schema.data.tables.length} об'єктів · отримано за {schema.data.durationMs} мс
            </p>
          )}
        </div>
      </div>

      {schema.isLoading && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <span className="loading loading-spinner loading-md" />
            <p className="text-sm">Завантаження схеми (це може зайняти кілька секунд)…</p>
          </div>
        </div>
      )}

      {schema.isError && (
        <div className="alert alert-error">
          <span>Помилка: {(schema.error as Error).message}</span>
        </div>
      )}

      {schema.data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="card bg-base-100 shadow">
              <div className="card-body p-3">
                <input
                  type="text"
                  className="input input-sm input-bordered w-full"
                  placeholder="Пошук таблиці (наприклад: sale, customer, prod)…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <div className="mt-2 max-h-[70vh] overflow-y-auto">
                  <table className="table table-xs">
                    <thead className="sticky top-0 bg-base-100">
                      <tr>
                        <th>Таблиця</th>
                        <th className="text-right">Рядків</th>
                        <th>Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => {
                        const active =
                          selected?.schema === t.schema && selected?.name === t.name;
                        return (
                          <tr
                            key={`${t.schema}.${t.name}`}
                            className={`cursor-pointer hover ${active ? 'bg-primary/10' : ''}`}
                            onClick={() => setSelected({ schema: t.schema, name: t.name })}
                          >
                            <td>
                              <div className="font-mono text-xs">
                                <span className="text-base-content/50">{t.schema}.</span>
                                <b>{t.name}</b>
                              </div>
                            </td>
                            <td className="text-right font-mono text-xs">
                              {t.type === 'VIEW' ? '—' : t.rowCount.toLocaleString('uk-UA')}
                            </td>
                            <td>
                              <span
                                className={`badge badge-xs ${
                                  t.type === 'VIEW' ? 'badge-warning' : 'badge-ghost'
                                }`}
                              >
                                {t.type === 'VIEW' ? 'VIEW' : 'TABLE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-base-content/50">
                            Нічого не знайдено
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="card bg-base-100 shadow">
              <div className="card-body p-3">
                {!selected && (
                  <p className="text-sm text-base-content/60">
                    Оберіть таблицю зліва, щоб побачити колонки.
                  </p>
                )}
                {selected && (
                  <>
                    <h2 className="font-mono text-sm">
                      <span className="text-base-content/50">{selected.schema}.</span>
                      <b>{selected.name}</b>
                    </h2>
                    {columns.isLoading && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    {columns.isError && (
                      <div className="alert alert-error text-xs">
                        {(columns.error as Error).message}
                      </div>
                    )}
                    {columns.data && (
                      <div className="max-h-[70vh] overflow-y-auto">
                        <table className="table table-xs">
                          <thead className="sticky top-0 bg-base-100">
                            <tr>
                              <th>#</th>
                              <th>Колонка</th>
                              <th>Тип</th>
                              <th>Null</th>
                              <th>PK</th>
                              <th>Identity</th>
                              <th>Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {columns.data.columns.map((c) => (
                              <tr key={c.name}>
                                <td className="text-xs text-base-content/50">{c.ordinal}</td>
                                <td className="font-mono">{c.name}</td>
                                <td className="font-mono text-xs">{formatType(c)}</td>
                                <td className="text-xs">{c.isNullable ? 'NULL' : ''}</td>
                                <td className="text-xs">
                                  {c.isPrimaryKey && (
                                    <span className="badge badge-primary badge-xs">PK</span>
                                  )}
                                </td>
                                <td className="text-xs">{c.isIdentity ? '⚙️' : ''}</td>
                                <td className="font-mono text-xs text-base-content/60">
                                  {c.defaultValue ?? ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatType(c: SchemaColumn): string {
  const t = c.dataType.toLowerCase();
  if (['nvarchar', 'nchar'].includes(t) && c.maxLength) {
    return `${t}(${c.maxLength === -1 ? 'max' : c.maxLength / 2})`;
  }
  if (['varchar', 'char', 'varbinary', 'binary'].includes(t) && c.maxLength) {
    return `${t}(${c.maxLength === -1 ? 'max' : c.maxLength})`;
  }
  if (['decimal', 'numeric'].includes(t)) {
    return `${t}(${c.precision},${c.scale})`;
  }
  return t;
}
