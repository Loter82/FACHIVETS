import type { DashboardOverviewDto, DashboardPeriod } from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const dashboardApi = {
  async overview(period: DashboardPeriod): Promise<DashboardOverviewDto> {
    const { data } = await http.get<DashboardOverviewDto>('/dashboard/overview', {
      params: { period },
    });
    return data;
  },
};
