import type { LoginRequest, LoginResponse, UserDto } from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>('/auth/login', payload);
    return data;
  },
  async me(): Promise<UserDto> {
    const { data } = await http.get<UserDto>('/auth/me');
    return data;
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },
};
