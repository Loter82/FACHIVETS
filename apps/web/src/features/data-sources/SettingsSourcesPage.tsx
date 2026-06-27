import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import type {
  DataSourceDto,
  MssqlCredentials,
  TestConnectionResponse,
} from '@unipro-crm/shared-types';
import { dataSourcesApi } from './api';

type FormValues = {
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  instance?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
};

const DEFAULTS: FormValues = {
  name: '',
  host: '',
  port: 1433,
  database: '',
  user: '',
  password: '',
  instance: '',
  encrypt: true,
  trustServerCertificate: true,
};

export function SettingsSourcesPage() {
  const qc = useQueryClient();
  const sources = useQuery({
    queryKey: ['data-sources'],
    queryFn: dataSourcesApi.list,
  });
  const [showForm, setShowForm] = useState(false);

  const onSaved = () => {
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ['data-sources'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Джерела даних</h1>
          <p className="text-sm text-base-content/70">
            Підключення до Unipro MS SQL Server для синхронізації продажів, товарів та клієнтів.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Додати джерело
        </button>
      </div>

      <div className="alert alert-info text-sm">
        <span>
          ℹ️ Ми читаємо БД Unipro <b>тільки SELECT-запитами</b>. Рекомендуємо створити окремого
          MSSQL-користувача з роллю <code>db_datareader</code> для цього CRM.
        </span>
      </div>

      {sources.isLoading && <div className="loading loading-spinner loading-md" />}

      {sources.data && sources.data.length === 0 && !showForm && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center text-center">
            <p className="text-base-content/70">Ще немає підключених джерел.</p>
            <button className="btn btn-primary mt-2" onClick={() => setShowForm(true)}>
              Додати перше джерело
            </button>
          </div>
        </div>
      )}

      {sources.data && sources.data.length > 0 && (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow">
          <table className="table">
            <thead>
              <tr>
                <th>Назва</th>
                <th>Тип</th>
                <th>Хост / БД</th>
                <th>Статус</th>
                <th>Останній тест</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sources.data.map((s) => (
                <SourceRow key={s.id} source={s} onChanged={onSaved} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <NewMssqlSourceForm onCancel={() => setShowForm(false)} onSaved={onSaved} />}
    </div>
  );
}

function SourceRow({
  source,
  onChanged,
}: {
  source: DataSourceDto;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const test = useMutation({
    mutationFn: () => dataSourcesApi.testExisting(source.id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['data-sources'] }),
  });
  const remove = useMutation({
    mutationFn: () => dataSourcesApi.remove(source.id),
    onSuccess: onChanged,
  });

  return (
    <tr>
      <td className="font-medium">{source.name}</td>
      <td>
        <span className="badge badge-ghost">
          {source.type === 'UNIPRO_MSSQL' ? 'MS SQL' : 'JSON-агент'}
        </span>
      </td>
      <td className="text-sm">
        {source.summary.host && (
          <div>
            {source.summary.host}
            {source.summary.port ? `:${source.summary.port}` : ''}
          </div>
        )}
        {source.summary.database && (
          <div className="text-xs text-base-content/60">{source.summary.database}</div>
        )}
      </td>
      <td>
        <StatusBadge status={source.status} />
        {source.lastErrorMessage && (
          <div className="mt-1 text-xs text-error">{source.lastErrorMessage}</div>
        )}
      </td>
      <td className="text-xs text-base-content/60">
        {source.lastTestedAt ? new Date(source.lastTestedAt).toLocaleString('uk-UA') : '—'}
      </td>
      <td>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            disabled={test.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? '...' : 'Тест'}
          </button>
          {source.type === 'UNIPRO_MSSQL' && source.status === 'ACTIVE' && (
            <Link to={`/settings/sources/${source.id}/schema`} className="btn btn-sm btn-ghost">
              Схема
            </Link>
          )}
          <button
            className="btn btn-sm btn-ghost text-error"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Видалити джерело «${source.name}»?`)) remove.mutate();
            }}
          >
            Видалити
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: DataSourceDto['status'] }) {
  const map: Record<DataSourceDto['status'], { label: string; cls: string }> = {
    DRAFT: { label: 'Чернетка', cls: 'badge-ghost' },
    ACTIVE: { label: 'Активне', cls: 'badge-success' },
    ERROR: { label: 'Помилка', cls: 'badge-error' },
    DISABLED: { label: 'Вимкнено', cls: 'badge-warning' },
  };
  const v = map[status];
  return <span className={`badge ${v.cls}`}>{v.label}</span>;
}

function NewMssqlSourceForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const formToCreds = (v: FormValues): MssqlCredentials => ({
    host: v.host.trim(),
    port: Number(v.port),
    database: v.database.trim(),
    user: v.user.trim(),
    password: v.password,
    instance: v.instance?.trim() || undefined,
    encrypt: v.encrypt,
    trustServerCertificate: v.trustServerCertificate,
  });

  const test = useMutation({
    mutationFn: () =>
      dataSourcesApi.testEphemeral({ type: 'UNIPRO_MSSQL', credentials: formToCreds(getValues()) }),
    onSuccess: (r) => setTestResult(r),
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Помилка тесту';
      setServerError(typeof msg === 'string' ? msg : 'Помилка тесту');
    },
  });

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      dataSourcesApi.create({
        name: v.name.trim(),
        type: 'UNIPRO_MSSQL',
        credentials: formToCreds(v),
      }),
    onSuccess: onSaved,
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Не вдалося зберегти';
      setServerError(typeof msg === 'string' ? msg : 'Не вдалося зберегти');
    },
  });

  return (
    <div className="card bg-base-100 shadow">
      <form
        className="card-body space-y-4"
        onSubmit={handleSubmit((v) => {
          setServerError(null);
          save.mutate(v);
        })}
      >
        <h2 className="card-title">Нове джерело — Unipro MS SQL</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Назва" error={errors.name?.message}>
            <input
              className="input input-bordered w-full"
              placeholder="Магазин Київ — Unipro"
              {...register('name', { required: 'Вкажіть назву' })}
            />
          </Field>

          <Field label="Хост / IP" error={errors.host?.message}>
            <input
              className="input input-bordered w-full"
              placeholder="192.168.1.10 або sql.unipro.local"
              {...register('host', { required: 'Вкажіть хост' })}
            />
          </Field>

          <Field label="Порт" error={errors.port?.message}>
            <input
              type="number"
              className="input input-bordered w-full"
              {...register('port', {
                valueAsNumber: true,
                required: true,
                min: { value: 1, message: 'Порт ≥ 1' },
                max: { value: 65535, message: 'Порт ≤ 65535' },
              })}
            />
          </Field>

          <Field label="База даних" error={errors.database?.message}>
            <input
              className="input input-bordered w-full"
              placeholder="UniProDB"
              {...register('database', { required: 'Вкажіть базу' })}
            />
          </Field>

          <Field label="Користувач" error={errors.user?.message}>
            <input
              className="input input-bordered w-full"
              placeholder="unipro_crm_reader"
              {...register('user', { required: 'Вкажіть користувача' })}
            />
          </Field>

          <Field label="Пароль" error={errors.password?.message}>
            <input
              type="password"
              className="input input-bordered w-full"
              autoComplete="new-password"
              {...register('password', { required: 'Вкажіть пароль' })}
            />
          </Field>

          <Field
            label="Іменований інстанс (необов'язково)"
            hint="Наприклад: SQLEXPRESS — якщо MSSQL запущений як іменований інстанс"
          >
            <input
              className="input input-bordered w-full"
              placeholder="SQLEXPRESS"
              {...register('instance')}
            />
          </Field>

          <div className="flex items-center gap-4 pt-7">
            <label className="label cursor-pointer gap-2">
              <input type="checkbox" className="checkbox" {...register('encrypt')} />
              <span className="label-text">TLS-шифрування</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox"
                {...register('trustServerCertificate')}
              />
              <span className="label-text">Self-signed</span>
            </label>
          </div>
        </div>

        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'} text-sm`}>
            <div>
              <div className="font-medium">
                {testResult.ok ? '✓ З\u0027єднання успішне' : '✗ Не вдалося підключитися'}
                <span className="ml-2 text-xs opacity-70">({testResult.durationMs} мс)</span>
              </div>
              {testResult.serverVersion && (
                <div className="text-xs opacity-80">{testResult.serverVersion}</div>
              )}
              {testResult.errorMessage && (
                <div className="text-xs">{testResult.errorMessage}</div>
              )}
              {testResult.tables && testResult.tables.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer">
                    Знайдено таблиць: {testResult.tables.length}
                  </summary>
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 md:grid-cols-3">
                    {testResult.tables.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {serverError && (
          <div className="alert alert-error text-sm">
            <span>{serverError}</span>
          </div>
        )}

        <div className="card-actions justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={test.isPending}
            onClick={() => {
              setServerError(null);
              setTestResult(null);
              test.mutate();
            }}
          >
            {test.isPending ? 'Перевіряю…' : 'Перевірити з\u0027єднання'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Зберігаю…' : 'Зберегти'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-control w-full">
      <div className="label py-1">
        <span className="label-text">{label}</span>
      </div>
      {children}
      {hint && (
        <div className="label py-0">
          <span className="label-text-alt text-base-content/60">{hint}</span>
        </div>
      )}
      {error && (
        <div className="label py-0">
          <span className="label-text-alt text-error">{error}</span>
        </div>
      )}
    </label>
  );
}
