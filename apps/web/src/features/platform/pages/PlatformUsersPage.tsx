import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type {
  CreatePlatformUserRequest,
  PlatformUserDto,
} from '@unipro-crm/shared-types';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import { platformApi } from '../api';

export function PlatformUsersPage() {
  const qc = useQueryClient();
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetting, setResetting] = useState<PlatformUserDto | null>(null);

  const tenantsQ = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: platformApi.listTenants,
  });
  const usersQ = useQuery({
    queryKey: ['platform', 'users', tenantFilter],
    queryFn: () => platformApi.listUsers(tenantFilter || undefined),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => platformApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'users'] }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformUserDto[]>();
    for (const u of usersQ.data ?? []) {
      const key = u.tenantSlug;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [usersQ.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold">Користувачі</h1>
          <p className="text-sm text-base-content/60">Всі користувачі з усіх тенантів.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select select-bordered select-sm"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          >
            <option value="">Всі тенанти</option>
            {tenantsQ.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Новий користувач
          </button>
        </div>
      </div>

      {usersQ.isLoading ? (
        <div className="skeleton h-64 w-full" />
      ) : usersQ.isError ? (
        <div className="alert alert-error">Помилка завантаження</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-base-content/50 ring-1 ring-black/5">
          Ще немає користувачів
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([slug, users]) => (
            <div key={slug} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <div className="border-b border-base-200 px-4 py-2 text-xs font-medium uppercase tracking-wider text-base-content/60">
                {slug}
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Користувач</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Останній вхід</th>
                    <th className="text-right">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium">{u.fullName}</div>
                        <div className="text-xs text-base-content/60">{u.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-ghost">{u.role}</span>
                      </td>
                      <td>
                        {u.status === 'ACTIVE' ? (
                          <span className="badge badge-success badge-sm">ACTIVE</span>
                        ) : u.status === 'INVITED' ? (
                          <span className="badge badge-info badge-sm">INVITED</span>
                        ) : (
                          <span className="badge badge-warning badge-sm">DISABLED</span>
                        )}
                      </td>
                      <td className="text-xs text-base-content/60">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('uk-UA') : '—'}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setResetting(u)}
                            title="Скинути пароль"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-rose-600"
                            onClick={() => {
                              if (
                                window.confirm(`Видалити користувача "${u.fullName}"?`)
                              ) {
                                deleteM.mutate(u.id);
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
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          defaultTenantId={tenantFilter || undefined}
        />
      )}
      {resetting && (
        <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  defaultTenantId,
}: {
  onClose: () => void;
  defaultTenantId?: string;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const tenantsQ = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: platformApi.listTenants,
  });
  const { register, handleSubmit } = useForm<CreatePlatformUserRequest>({
    defaultValues: {
      role: 'MANAGER',
      status: 'ACTIVE',
      tenantId: defaultTenantId ?? '',
    },
  });
  const createM = useMutation({
    mutationFn: platformApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'users'] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Не вдалося створити',
      );
    },
  });

  const onSubmit = handleSubmit((v) => {
    setError(null);
    createM.mutate(v);
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="mb-4 text-lg font-semibold">Новий користувач</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text text-sm">Тенант</span>
            </div>
            <select
              className="select select-bordered w-full"
              {...register('tenantId', { required: true })}
            >
              <option value="" disabled>
                Оберіть тенант…
              </option>
              {tenantsQ.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text text-sm">ПІБ</span>
            </div>
            <input
              className="input input-bordered w-full"
              {...register('fullName', { required: true })}
            />
          </label>
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text text-sm">Email</span>
            </div>
            <input
              type="email"
              className="input input-bordered w-full"
              {...register('email', { required: true })}
            />
          </label>
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text text-sm">Пароль (мін. 8)</span>
            </div>
            <input
              className="input input-bordered w-full"
              {...register('password', { required: true, minLength: 8 })}
            />
          </label>
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text text-sm">Роль</span>
            </div>
            <select className="select select-bordered w-full" {...register('role')}>
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="MARKETER">MARKETER</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </label>

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

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: PlatformUserDto;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const updateM = useMutation({
    mutationFn: () => platformApi.updateUser(user.id, { password }),
    onSuccess: onClose,
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Не вдалося оновити',
      );
    },
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="mb-2 text-lg font-semibold">Скинути пароль</h3>
        <p className="mb-4 text-xs text-base-content/60">{user.email}</p>
        <input
          className="input input-bordered w-full"
          placeholder="Новий пароль (мін. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="alert alert-error mt-3 text-sm">{error}</div>}
        <div className="modal-action">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Скасувати
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={password.length < 8 || updateM.isPending}
            onClick={() => updateM.mutate()}
          >
            Скинути
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose} />
    </div>
  );
}
