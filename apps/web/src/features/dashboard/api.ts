import type {
  DashboardCustomerItemsResponse,
  DashboardCustomersResponse,
  DashboardOverviewDto,
  DashboardPeriod,
  DashboardRangeOverride,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const dashboardApi = {
  async overview(
    period: DashboardPeriod,
    range?: DashboardRangeOverride,
  ): Promise<DashboardOverviewDto> {
    const { data } = await http.get<DashboardOverviewDto>('/dashboard/overview', {
      params: { period, from: range?.from, to: range?.to },
    });
    return data;
  },
  async customers(
    period: DashboardPeriod,
    page = 1,
    pageSize = 50,
    range?: DashboardRangeOverride,
  ): Promise<DashboardCustomersResponse> {
    const { data } = await http.get<DashboardCustomersResponse>('/dashboard/customers', {
      params: { period, page, pageSize, from: range?.from, to: range?.to },
    });
    return data;
  },
  async customerItems(
    partnerId: number,
    period: DashboardPeriod,
    limit = 200,
    range?: DashboardRangeOverride,
  ): Promise<DashboardCustomerItemsResponse> {
    const { data } = await http.get<DashboardCustomerItemsResponse>(
      `/dashboard/customers/${partnerId}/items`,
      { params: { period, limit, from: range?.from, to: range?.to } },
    );
    return data;
  },
};
