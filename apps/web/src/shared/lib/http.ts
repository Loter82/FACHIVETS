import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/app/auth-store';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

http.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(`${baseURL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        useAuthStore.getState().setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NON_RETRYABLE_AUTH = ['/auth/login', '/auth/refresh', '/auth/logout'];

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NON_RETRYABLE_AUTH.some((p) => url.includes(p))
    ) {
      try {
        original._retry = true;
        const token = await refreshAccessToken();
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
        return http.request(original);
      } catch {
        useAuthStore.getState().clear();
      }
    }
    return Promise.reject(error);
  },
);
