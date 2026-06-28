/**
 * Stock (залишки товарів) — DTO для UI.
 * Кожен товар має кілька рядків залишку (1 на склад).
 * Аналітика будується з MirrorStoreStock + MirrorGood (priceIn — собівартість, priceOut — ціна продажу).
 */

export type StockSort =
  | 'name'
  | 'qtty'
  | 'valueCost'
  | 'valueSale'
  | 'margin'
  | 'lastSaleAt';

export interface StockListQuery {
  sourceId?: string;
  search?: string;
  groupId?: number;
  storeId?: number;
  /** Фільтри по залишку: 'in' = qtty > 0, 'out' = qtty <= 0, 'negative' = qtty < 0. */
  presence?: 'all' | 'in' | 'out' | 'negative';
  sort?: StockSort;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface StockSummaryQuery {
  sourceId?: string;
}

export interface StockStoreRowDto {
  storeId: number;
  storeName: string | null;
  qtty: number;
}

export interface StockItemDto {
  goodId: number;
  goodCode: string | null;
  goodName: string;
  groupId: number | null;
  groupName: string | null;
  unit: string | null;
  priceIn: number;
  priceOut: number;
  totalQtty: number;
  valueCost: number;
  valueSale: number;
  marginAmount: number;
  marginPct: number;
  lastSaleAt: string | null;
  stores: StockStoreRowDto[];
}

export interface StockListResponse {
  rows: StockItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockSummaryDto {
  totalSkus: number;
  positiveSkus: number;
  zeroSkus: number;
  negativeSkus: number;
  totalQtty: number;
  totalValueCost: number;
  totalValueSale: number;
  potentialMarginAmount: number;
  potentialMarginPct: number;
  stores: Array<{
    storeId: number;
    storeName: string | null;
    skuCount: number;
    totalQtty: number;
    valueCost: number;
    valueSale: number;
  }>;
}

export interface StockGroupRowDto {
  groupId: number | null;
  groupName: string | null;
  skuCount: number;
  totalQtty: number;
  valueCost: number;
  valueSale: number;
  marginAmount: number;
  marginPct: number;
}

export interface StockGroupsResponse {
  rows: StockGroupRowDto[];
}

export interface StockAnalyticsQuery {
  sourceId?: string;
  /** Скільки днів дивимось «спалене з продажів» для визначення мертвого стоку / дефіциту. */
  windowDays?: number;
  limit?: number;
}

export interface StockTopValueRowDto {
  goodId: number;
  goodName: string;
  groupName: string | null;
  totalQtty: number;
  valueCost: number;
  valueSale: number;
}

export interface StockDeadRowDto {
  goodId: number;
  goodName: string;
  groupName: string | null;
  totalQtty: number;
  valueCost: number;
  lastSaleAt: string | null;
  daysSinceSale: number | null;
}

export interface StockShortageRowDto {
  goodId: number;
  goodName: string;
  groupName: string | null;
  totalQtty: number;
  qttySoldWindow: number;
  avgDailySales: number;
  daysOfStock: number | null;
  lastSaleAt: string | null;
}

export interface StockAnalyticsResponse {
  windowDays: number;
  topByValue: StockTopValueRowDto[];
  deadStock: StockDeadRowDto[];
  shortage: StockShortageRowDto[];
}
