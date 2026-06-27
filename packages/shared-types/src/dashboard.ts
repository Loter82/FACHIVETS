export type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface DashboardKpiDto {
  period: DashboardPeriod;
  from: string | null;
  to: string | null;
  revenue: number;
  ordersCount: number;
  avgCheck: number;
  uniqueCustomers: number;
  itemsSold: number;
  returnsSum: number;
  /// Розбивка за каналом продажу.
  retailRevenue: number;
  retailOrders: number;
  wholesaleRevenue: number;
  wholesaleOrders: number;
  /// Виторг попереднього періоду тієї ж тривалості (для дельти). null = немає бази.
  revenuePrev: number | null;
  ordersCountPrev: number | null;
  avgCheckPrev: number | null;
  uniqueCustomersPrev: number | null;
}

export interface RevenueTimelinePoint {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface RevenueTimelineResponse {
  period: DashboardPeriod;
  from: string;
  to: string;
  bucket: 'day' | 'week' | 'month';
  points: RevenueTimelinePoint[];
}

export interface TopCustomerDto {
  partnerId: number;
  displayName: string;
  cardNumber: string | null;
  ordersCount: number;
  revenue: number;
}

export interface TopProductDto {
  goodId: number;
  name: string | null;
  code: string | null;
  qtty: number;
  revenue: number;
}

export interface DashboardOverviewDto {
  kpi: DashboardKpiDto;
  timeline: RevenueTimelineResponse;
  topCustomers: TopCustomerDto[];
  topProducts: TopProductDto[];
}
