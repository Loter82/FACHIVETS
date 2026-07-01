import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { LoginRequest } from '@unipro-crm/shared-types';
import { authApi } from '../api';
import { useAuthStore } from '@/app/auth-store';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({ defaultValues: { email: '', password: '' } });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      const dest = data.user.role === 'PLATFORM_ADMIN' ? '/platform' : from;
      navigate(dest, { replace: true });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Не вдалося увійти. Спробуйте ще раз.';
      setServerError(typeof msg === 'string' ? msg : 'Не вдалося увійти');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl">Вхід в UniBoost</h1>
          <p className="text-sm text-base-content/70">Введіть свої облікові дані</p>

          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={handleSubmit((v) => {
              setServerError(null);
              mutation.mutate(v);
            })}
          >
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Email</span>
              </div>
              <input
                type="email"
                autoComplete="email"
                className="input input-bordered w-full"
                placeholder="you@example.com"
                {...register('email', { required: 'Вкажіть email' })}
              />
              {errors.email && (
                <div className="label">
                  <span className="label-text-alt text-error">{errors.email.message}</span>
                </div>
              )}
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Пароль</span>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                className="input input-bordered w-full"
                placeholder="••••••••"
                {...register('password', { required: 'Вкажіть пароль', minLength: 8 })}
              />
              {errors.password && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {errors.password.message ?? 'Пароль занадто короткий'}
                  </span>
                </div>
              )}
            </label>

            {serverError && (
              <div role="alert" className="alert alert-error text-sm">
                <span>{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Вхід…' : 'Увійти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
