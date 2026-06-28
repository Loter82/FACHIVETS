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
  /// Собівартість реалізованих товарів за період (SUM(qtty*priceIn) по продажах).
  cogs: number;
  /// Валовий прибуток (revenue - cogs).
  grossProfit: number;
  /// Маржинальність у % (grossProfit / revenue * 100). null, якщо revenue=0.
  marginPct: number | null;
  /// Виторг попереднього періоду тієї ж тривалості (для дельти). null = немає бази.
  revenuePrev: number | null;
  ordersCountPrev: number | null;
  avgCheckPrev: number | null;
  uniqueCustomersPrev: number | null;
  cogsPrev: number | null;
  grossProfitPrev: number | null;
  marginPctPrev: number | null;
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
  bucket: 'hour' | 'day' | 'week' | 'month';
  points: RevenueTimelinePoint[];
}

export interface TopCustomerDto {
  partnerId: number;
  displayName: string;
  cardNumber: string | null;
  ordersCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
}

export interface TopProductDto {
  goodId: number;
  name: string | null;
  code: string | null;
  qtty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
}

export interface DashboardOverviewDto {
  kpi: DashboardKpiDto;
  timeline: RevenueTimelineResponse;
  topCustomers: TopCustomerDto[];
  topProducts: TopProductDto[];
}

/// Рядок у drill-down списку клієнтів за період.
export interface DashboardCustomerRow {
  partnerId: number;
  /// Внутрішній cuid mirror_partners (для лінків на профіль). null, якщо клієнт ще не дзеркалився.
  customerId: string | null;
  displayName: string;
  cardNumber: string | null;
  ordersCount: number;
  revenue: number;
  returnsSum: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
  lastPurchaseAt: string | null;
}

export interface DashboardCustomersResponse {
  period: DashboardPeriod;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
  total: number;
  items: DashboardCustomerRow[];
}

/// Позиція, придбана клієнтом за період (агрегована по товару).
export interface DashboardCustomerItem {
  goodId: number;
  name: string | null;
  code: string | null;
  qtty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
  /// Скільки документів містили цей товар.
  ordersCount: number;
}

export interface DashboardCustomerItemsResponse {
  period: DashboardPeriod;
  from: string | null;
  to: string | null;
  partnerId: number;
  customerId: string | null;
  displayName: string;
  totalRevenue: number;
  totalQtty: number;
  totalCogs: number;
  totalGrossProfit: number;
  totalMarginPct: number | null;
  items: DashboardCustomerItem[];
}
