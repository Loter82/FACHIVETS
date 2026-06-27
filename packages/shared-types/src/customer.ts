/// Запис у списку клієнтів (агрегат поверх mirror_partners + mirror_documents).
export interface CustomerListItemDto {
  id: string;
  externalId: number;
  code: string | null;
  displayName: string;
  cardNumber: string | null;
  groupId: number | null;
  groupName: string | null;
  phones: string[];
  ordersCount: number;
  salesSum: number;
  returnsSum: number;
  netRevenue: number;
  avgOrderValue: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
}

export interface CustomerListResponse {
  items: CustomerListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export type CustomerSort =
  | 'name'
  | 'lastPurchase'
  | 'revenue'
  | 'ordersCount'
  | 'firstPurchase';

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  groupId?: number;
  hasPurchases?: boolean;
  sort?: CustomerSort;
  order?: 'asc' | 'desc';
}

export interface CustomerProfileDto {
  id: string;
  externalId: number;
  code: string | null;
  displayName: string;
  namePrint: string | null;
  cardNumber: string | null;
  groupId: number | null;
  groupName: string | null;
  phones: string[];
  addresses: string[];
  dates: string[];
  edrpou: string | null;
  inn: string | null;
  description: string | null;
  state: number | null;
  syncedAt: string;
  stats: CustomerStatsDto;
}

export interface CustomerStatsDto {
  ordersCount: number;
  salesSum: number;
  returnsSum: number;
  netRevenue: number;
  avgOrderValue: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  daysSinceLastPurchase: number | null;
  uniqueStores: number;
}

export interface CustomerOrderDto {
  id: string;
  externalId: string;
  docNum: string | null;
  docType: number;
  docTypeLabel: string;
  dateTime: string;
  docSum: number;
  storeId: number | null;
  storeName: string | null;
  itemsCount: number;
  description: string | null;
}

export interface CustomerOrdersResponse {
  items: CustomerOrderDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerOrderItemDto {
  id: string;
  externalId: string;
  goodId: string;
  goodName: string | null;
  goodCode: string | null;
  qtty: number;
  priceOut: number;
  discount: number;
  sum: number;
}
