import type {
  CustomerListQuery,
  CustomerListResponse,
  CustomerOrdersResponse,
  CustomerProfileDto,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const customersApi = {
  async list(query: CustomerListQuery = {}): Promise<CustomerListResponse> {
    const { data } = await http.get<CustomerListResponse>('/customers', { params: query });
    return data;
  },
  async profile(id: string): Promise<CustomerProfileDto> {
    const { data } = await http.get<CustomerProfileDto>(`/customers/${id}`);
    return data;
  },
  async orders(id: string, page = 1, pageSize = 25): Promise<CustomerOrdersResponse> {
    const { data } = await http.get<CustomerOrdersResponse>(`/customers/${id}/orders`, {
      params: { page, pageSize },
    });
    return data;
  },
};
