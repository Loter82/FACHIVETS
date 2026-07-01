import type {
  CreatePlatformUserRequest,
  CreateTenantRequest,
  PlatformOverview,
  PlatformTenantDto,
  PlatformUserDto,
  UpdatePlatformUserRequest,
  UpdateTenantRequest,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const platformApi = {
  async overview(): Promise<PlatformOverview> {
    const { data } = await http.get<PlatformOverview>('/platform/overview');
    return data;
  },

  async listTenants(): Promise<PlatformTenantDto[]> {
    const { data } = await http.get<PlatformTenantDto[]>('/platform/tenants');
    return data;
  },

  async createTenant(payload: CreateTenantRequest): Promise<PlatformTenantDto> {
    const { data } = await http.post<PlatformTenantDto>('/platform/tenants', payload);
    return data;
  },

  async updateTenant(id: string, payload: UpdateTenantRequest): Promise<PlatformTenantDto> {
    const { data } = await http.patch<PlatformTenantDto>(`/platform/tenants/${id}`, payload);
    return data;
  },

  async deleteTenant(id: string): Promise<void> {
    await http.delete(`/platform/tenants/${id}`);
  },

  async listUsers(tenantId?: string): Promise<PlatformUserDto[]> {
    const { data } = await http.get<PlatformUserDto[]>('/platform/users', {
      params: tenantId ? { tenantId } : undefined,
    });
    return data;
  },

  async createUser(payload: CreatePlatformUserRequest): Promise<PlatformUserDto> {
    const { data } = await http.post<PlatformUserDto>('/platform/users', payload);
    return data;
  },

  async updateUser(id: string, payload: UpdatePlatformUserRequest): Promise<PlatformUserDto> {
    const { data } = await http.patch<PlatformUserDto>(`/platform/users/${id}`, payload);
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await http.delete(`/platform/users/${id}`);
  },
};
