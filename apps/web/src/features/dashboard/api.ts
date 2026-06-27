import type {
  DashboardCustomerItemsResponse,
  DashboardCustomersResponse,
  DashboardOverviewDto,
  DashboardPeriod,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const dashboardApi = {
  async overview(period: DashboardPeriod): Promise<DashboardOverviewDto> {
    const { data } = await http.get<DashboardOverviewDto>('/dashboard/overview', {
      params: { period },
    });
    return data;
  },
  async customers(
    period: DashboardPeriod,
    page = 1,
    pageSize = 50,
  ): Promise<DashboardCustomersResponse> {
    const { data } = await http.get<DashboardCustomersResponse>('/dashboard/customers', {
      params: { period, page, pageSize },
    });
    return data;
  },
  async customerItems(
    partnerId: number,
    period: DashboardPeriod,
    limit = 200,
  ): Promise<DashboardCustomerItemsResponse> {
    const { data } = await http.get<DashboardCustomerItemsResponse>(
      `/dashboard/customers/${partnerId}/items`,
      { params: { period, limit } },
    );
    return data;
  },
};
