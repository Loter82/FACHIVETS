import type {
  CustomerListQuery,
  CustomerListResponse,
  CustomerMonthlyQuery,
  CustomerMonthlyResponse,
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
  async monthly(id: string, query: CustomerMonthlyQuery = {}): Promise<CustomerMonthlyResponse> {
    const { data } = await http.get<CustomerMonthlyResponse>(`/customers/${id}/monthly`, {
      params: query,
    });
    return data;
  },
};
