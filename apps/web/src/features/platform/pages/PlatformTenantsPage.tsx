import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type {
  CreateTenantRequest,
  PlatformTenantDto,
  UpdateTenantRequest,
} from '@unipro-crm/shared-types';
import { Plus, Ban, Play, Trash2, Building2, Copy, Check } from 'lucide-react';
import { platformApi } from '../api';

export function PlatformTenantsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PlatformTenantDto | null>(null);

  const tenantsQ = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: platformApi.listTenants,
    refetchInterval: 30_000,
  });

  const suspendM = useMutation({
    mutationFn: (id: string) => platformApi.updateTenant(id, { status: 'SUSPENDED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  });
  const activateM = useMutation({
    mutationFn: (id: string) => platformApi.updateTenant(id, { status: 'ACTIVE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => platformApi.deleteTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Тенанти</h1>
          <p className="text-sm text-base-content/60">
            Керуйте клієнтами, створюйте нові, зупиняйте доступ.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Новий тенант
        </button>
      </div>

      {tenantsQ.isLoading ? (
        <div className="skeleton h-64 w-full" />
      ) : tenantsQ.isError ? (
        <div className="alert alert-error">
          <span>Не вдалося завантажити список тенантів</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          <table className="table">
            <thead>
              <tr>
                <th>Тенант</th>
                <th>План</th>
                <th>Статус</th>
                <th>Користувачі</th>
                <th>Джерела</th>
                <th>Остання синхр.</th>
                <th className="text-right">Дії</th>
              </tr>
            </thead>
            <tbody>
              {tenantsQ.data?.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Building2 size={16} className="text-base-content/40" />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <TenantSlug slug={t.slug} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-ghost">{t.plan}</span>
                  </td>
                  <td>
                    {t.status === 'ACTIVE' ? (
                      <span className="badge badge-success">ACTIVE</span>
                    ) : (
                      <span className="badge badge-error">SUSPENDED</span>
                    )}
                  </td>
                  <td>{t.usersCount}</td>
                  <td>
                    {t.activeDataSourcesCount}/{t.dataSourcesCount}
                  </td>
                  <td className="text-xs text-base-content/60">
                    {t.lastSyncAt ? new Date(t.lastSyncAt).toLocaleString('uk-UA') : '—'}
                    {t.lastSyncError && (
                      <div className="mt-0.5 line-clamp-1 text-rose-500">{t.lastSyncError}</div>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEditing(t)}
                      >
                        Ред.
                      </button>
                      {t.status === 'ACTIVE' ? (
                        <button
                          className="btn btn-ghost btn-xs text-rose-600"
                          onClick={() => suspendM.mutate(t.id)}
                          disabled={suspendM.isPending}
                        >
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs text-emerald-600"
                          onClick={() => activateM.mutate(t.id)}
                          disabled={activateM.isPending}
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs text-rose-600"
                        onClick={() => {
                          if (window.confirm(`Видалити тенант "${t.name}" безповоротно?`)) {
                            deleteM.mutate(t.id);
                          }
                        }}
                        disabled={deleteM.isPending}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenantsQ.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-base-content/50">
                    Ще немає тенантів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
      {editing && <EditTenantModal tenant={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TenantSlug({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs text-base-content/60 hover:text-base-content"
      onClick={() => {
        navigator.clipboard.writeText(slug);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <code>{slug}</code>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Create modal
// -----------------------------------------------------------------------------

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [withOwner, setWithOwner] = useState(true);

  interface FormValues {
    name: string;
    slug: string;
    plan: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    ownerEmail: string;
    ownerPassword: string;
    ownerFullName: string;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { plan: 'TRIAL' },
  });

  const createM = useMutation({
    mutationFn: platformApi.createTenant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      qc.invalidateQueries({ queryKey: ['platform', 'overview'] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Не вдалося створити тенант',
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    const payload: CreateTenantRequest = {
      name: values.name,
      slug: values.slug,
      plan: values.plan,
    };
    if (withOwner) {
      payload.owner = {
        email: values.ownerEmail,
        password: values.ownerPassword,
        fullName: values.ownerFullName,
        role: 'OWNER',
      };
    }
    createM.mutate(payload);
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="mb-4 text-lg font-semibold">Новий тенант</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Назва компанії" error={errors.name?.message}>
            <input
              className="input input-bordered w-full"
              {...register('name', { required: 'Обовʼязково' })}
            />
          </Field>
          <Field
            label="Slug (латиниця, тире)"
            error={errors.slug?.message}
            hint="2–41 символів [a-z0-9-]"
          >
            <input
              className="input input-bordered w-full"
              {...register('slug', {
                required: 'Обовʼязково',
                pattern: {
                  value: /^[a-z0-9][a-z0-9-]{1,40}$/,
                  message: 'Лише [a-z0-9-], починається з літери/цифри',
                },
              })}
              placeholder="acme-hardware"
            />
          </Field>
          <Field label="Тариф">
            <select className="select select-bordered w-full" {...register('plan')}>
              <option value="TRIAL">TRIAL</option>
              <option value="STARTER">STARTER</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </Field>

          <div className="divider my-2 text-xs">Власник тенанта</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={withOwner}
              onChange={(e) => setWithOwner(e.target.checked)}
            />
            Одразу створити акаунт власника
          </label>
          {withOwner && (
            <>
              <Field label="ПІБ" error={errors.ownerFullName?.message}>
                <input
                  className="input input-bordered w-full"
                  {...register('ownerFullName', {
                    required: withOwner ? 'Обовʼязково' : false,
                  })}
                />
              </Field>
              <Field label="Email" error={errors.ownerEmail?.message}>
                <input
                  className="input input-bordered w-full"
                  type="email"
                  {...register('ownerEmail', {
                    required: withOwner ? 'Обовʼязково' : false,
                  })}
                />
              </Field>
              <Field
                label="Пароль"
                error={errors.ownerPassword?.message}
                hint="Мінімум 8 символів. Передайте клієнту після оплати."
              >
                <input
                  className="input input-bordered w-full"
                  type="text"
                  {...register('ownerPassword', {
                    required: withOwner ? 'Обовʼязково' : false,
                    minLength: { value: 8, message: 'Мінімум 8 символів' },
                  })}
                />
              </Field>
            </>
          )}

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <div className="modal-action">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={createM.isPending}>
              {createM.isPending ? 'Створення…' : 'Створити'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Edit modal
// -----------------------------------------------------------------------------

function EditTenantModal({
  tenant,
  onClose,
}: {
  tenant: PlatformTenantDto;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<UpdateTenantRequest>({
    defaultValues: {
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    },
  });

  const updateM = useMutation({
    mutationFn: (v: UpdateTenantRequest) => platformApi.updateTenant(tenant.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Не вдалося оновити',
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    updateM.mutate(values);
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="mb-4 text-lg font-semibold">Редагувати тенант</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Назва">
            <input className="input input-bordered w-full" {...register('name')} />
          </Field>
          <Field label="Slug">
            <input className="input input-bordered w-full" {...register('slug')} />
          </Field>
          <Field label="Тариф">
            <select className="select select-bordered w-full" {...register('plan')}>
              <option value="TRIAL">TRIAL</option>
              <option value="STARTER">STARTER</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </Field>

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <div className="modal-action">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={updateM.isPending}>
              {updateM.isPending ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose} />
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
      <div className="label pb-1">
        <span className="label-text text-sm">{label}</span>
      </div>
      {children}
      {(hint || error) && (
        <div className="label pt-1">
          {error ? (
            <span className="text-xs text-error">{error}</span>
          ) : (
            <span className="text-xs text-base-content/50">{hint}</span>
          )}
        </div>
      )}
    </label>
  );
}
