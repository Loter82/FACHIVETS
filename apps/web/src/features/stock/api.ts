import type {
  StockAnalyticsQuery,
  StockAnalyticsResponse,
  StockGroupsResponse,
  StockListQuery,
  StockListResponse,
  StockSummaryDto,
} from '@unipro-crm/shared-types';
import { http } from '@/shared/lib/http';

export const stockApi = {
  async summary(): Promise<StockSummaryDto> {
    const { data } = await http.get<StockSummaryDto>('/stock/summary');
    return data;
  },
  async groups(storeId?: number): Promise<StockGroupsResponse> {
    const { data } = await http.get<StockGroupsResponse>('/stock/groups', {
      params: storeId !== undefined ? { storeId } : {},
    });
    return data;
  },
  async list(query: StockListQuery = {}): Promise<StockListResponse> {
    const { data } = await http.get<StockListResponse>('/stock/items', { params: query });
    return data;
  },
  async analytics(query: StockAnalyticsQuery = {}): Promise<StockAnalyticsResponse> {
    const { data } = await http.get<StockAnalyticsResponse>('/stock/analytics', { params: query });
    return data;
  },
};
